class Preview {
  constructor(options = 0) {
    var scope = this;
    if (options && options.id) {
      this.id = options.id;
    }
    //Node
    this.canvas = document.createElement("canvas");
    this.canvas.preview = this;
    this.height = 0;
    this.width = 0;
    this.node = document.createElement("div");
    this.node.className = "preview";
    this.node.appendChild(this.canvas);
    let menu = $(`
              <div class="preview_menu">
                  <div class="tool preview_background_menu" hidden><img src="" width="36px"></div>
                  <div class="tool preview_main_menu"><i class="material-icons">more_vert</i></div>
              </div>`)[0];
    menu.firstElementChild.onclick = (event) => {
      let M = new Menu(
        this.menu.structure.find((s) => s.id == "background").children(this)
      );
      M.open(menu, this);
    };
    menu.lastElementChild.onclick = (event) => {
      this.menu.open(menu, this);
    };
    BarItem.prototype.addLabel(false, {
      name: tl("menu.preview.background"),
      node: menu.firstElementChild,
    });
    BarItem.prototype.addLabel(false, {
      name: tl("data.preview"),
      node: menu.lastElementChild,
    });
    this.node.appendChild(menu);
    //Cameras
    this.offscreen = !!options.offscreen;
    this.isOrtho = false;
    this.angle = null;
    this.camPers = new THREE.PerspectiveCamera(
      settings.fov.value,
      16 / 9,
      settings.camera_near_plane.value || 1,
      30000
    );
    this.camOrtho = new THREE.OrthographicCamera(
      -600,
      600,
      -400,
      400,
      -200,
      20000
    );
    this.camOrtho.backgroundHandle = [
      { n: false, a: "x" },
      { n: false, a: "y" },
    ];
    this.camOrtho.axis = null;
    this.camOrtho.zoom = 0.5;
    this.camPers.preview = this.camOrtho.preview = this;
    for (var i = 4; i <= 6; i++) {
      this.camPers.layers.enable(i);
    }
    this.side_view_target = new THREE.Vector3();

    //Controls
    this.controls = new THREE.OrbitControls(this.camPers, this);
    this.controls.minDistance = 1;
    this.controls.maxDistance = 3960;
    this.controls.enableKeys = false;
    this.controls.zoomSpeed = 1.5;
    this.controls.onUpdate(() => {
      if (this.angle != null) {
        if (this.camOrtho.axis != "x")
          this.side_view_target.x = this.controls.target.x;
        if (this.camOrtho.axis != "y")
          this.side_view_target.y = this.controls.target.y;
        if (this.camOrtho.axis != "z")
          this.side_view_target.z = this.controls.target.z;
      }
    });

    //Annotations
    this.annotations = {};
    this.updateAnnotations = function () {
      for (var key in scope.annotations) {
        var tag = scope.annotations[key];
        if (tag.object.visible) {
          var pos = tag.object.toScreenPosition(scope.camera, scope.canvas);
          tag.node.style.setProperty("left", pos.x + "px");
          tag.node.style.setProperty("top", pos.y + "px");
        }
      }
    };
    this.controls.onUpdate(() =>
      setTimeout(() => {
        scope.updateAnnotations();
      }, 6)
    );
    this.addAnnotation = function (key, tag) {
      scope.annotations[key] = tag;
      $(tag.node).insertBefore(scope.canvas);
      scope.updateAnnotations();
    };
    this.removeAnnotation = function (key) {
      if (scope.annotations[key]) {
        $(scope.annotations[key].node).detach();
        delete scope.annotations[key];
      }
    };

    this.default_angle = DefaultCameraPresets[0];

    this.camPers.position.fromArray(this.default_angle.position);
    this.controls.target.fromArray(this.default_angle.target);

    if (!Blockbench.isMobile && !this.offscreen) {
      this.orbit_gizmo = new OrbitGizmo(this);
      this.node.append(this.orbit_gizmo.node);
    }

    //Keybinds
    this.controls.mouseButtons.ZOOM = undefined;

    //Renderer
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias:
          typeof options.antialias == "boolean"
            ? options.antialias
            : Settings.get("antialiasing"),
        alpha: true,
        preserveDrawingBuffer: true,
      });
    } catch (err) {
      let error_element = document.querySelector("#loading_error_detail");
      error_element.innerHTML = `Error creating WebGL context. Try to update your graphics drivers.`;

      if (isApp) {
        window.restartWithoutHardwareAcceleration = function () {
          ipcRenderer.send("edit-launch-setting", {
            key: "hardware_acceleration",
            value: false,
          });
          settings.hardware_acceleration = false;
          Settings.saveLocalStorages();

          electron.app.relaunch();
          electron.app.quit();
        };
        error_element.innerHTML =
          error_element.innerHTML +
          '\nAlternatively, try to <a href onclick="restartWithoutHardwareAcceleration()">Restart without Hardware Acceleration.</a>';

        var { BrowserWindow } = require("@electron/remote");
        new BrowserWindow({
          icon: "icon.ico",
          backgroundColor: "#ffffff",
          title: "Blockbench GPU Information",
          webPreferences: {
            webgl: true,
            webSecurity: true,
            nodeIntegration: true,
          },
        }).loadURL("chrome://gpu");
      }
      throw err;
    }
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setSize(500, 400);

    this.loadBackground();

    this.selection = {
      box: $('<div id="selection_box" class="selection_rectangle"></div>'),
      frustum: new THREE.Frustum(),
    };

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    addEventListeners(
      this.canvas,
      "mousedown touchstart",
      (event) => {
        this.click(event);
      },
      { passive: false }
    );
    addEventListeners(
      this.canvas,
      "mousemove touchmove",
      (event) => {
        this.static_rclick = false;
      },
      false
    );
    addEventListeners(
      this.canvas,
      "mousemove",
      (event) => {
        this.mousemove(event);
      },
      false
    );
    addEventListeners(
      this.canvas,
      "mouseup touchend",
      (event) => {
        this.mouseup(event);
      },
      false
    );
    addEventListeners(
      this.canvas,
      "dblclick",
      (event) => {
        Toolbox.toggleTransforms(event);
      },
      false
    );
    addEventListeners(
      this.canvas,
      "mouseenter touchstart",
      (event) => {
        this.occupyTransformer(event);
      },
      false
    );
    addEventListeners(
      this.canvas,
      "mouseenter",
      (event) => {
        this.controls.hasMoved = true;
      },
      false
    );

    Blockbench.addDragHandler(
      "preview_" + this.id,
      {
        extensions: ["jpg", "jpeg", "bmp", "tiff", "tif", "gif"],
        element: this.canvas,
        readtype: "image",
      },
      function (files) {
        if (isApp) {
          scope.background.image = files[0].path;
        } else {
          scope.background.image = files[0].content;
        }
        scope.loadBackground();
      }
    );
    Preview.all.push(this);
  }
  //Render
  resize(width, height) {
    if (this.canvas.isConnected && this !== MediaPreview) {
      this.height = this.node.parentElement.clientHeight;
      this.width = this.node.parentElement.clientWidth;
    } else if (height && width) {
      this.height = height;
      this.width = width;
    } else {
      return this;
    }

    if (this.isOrtho === false) {
      this.camPers.aspect = this.width / this.height;
      this.camPers.updateProjectionMatrix();
    } else {
      this.camOrtho.right = this.width / 80;
      this.camOrtho.left = this.camOrtho.right * -1;
      this.camOrtho.top = this.height / 80;
      this.camOrtho.bottom = this.camOrtho.top * -1;
      this.camOrtho.updateProjectionMatrix();
    }
    this.renderer.setSize(this.width, this.height);

    if (this.canvas.isConnected) {
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.updateBackground();
      if (Transformer) {
        Transformer.update();
      }
    }
    return this;
  }
  raycast(event) {
    convertTouchEvent(event);
    var canvas_offset = $(this.canvas).offset();
    this.mouse.x = ((event.clientX - canvas_offset.left) / this.width) * 2 - 1;
    this.mouse.y = -((event.clientY - canvas_offset.top) / this.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    var objects = [];
    Outliner.elements.forEach((element) => {
      if (
        element.mesh &&
        element.mesh.geometry &&
        element.visibility &&
        !element.locked
      ) {
        objects.push(element.mesh);
        if (Modes.edit && element.selected) {
          if (
            element.mesh.vertex_points &&
            element.mesh.vertex_points.visible
          ) {
            objects.push(element.mesh.vertex_points);
          }
          if (
            element instanceof Mesh &&
            element.mesh.outline.visible &&
            BarItems.selection_mode.value == "edge"
          ) {
            objects.push(element.mesh.outline);
          }
        }
      }
    });
    if (Vertexsnap.vertex_gizmos.children.length) {
      Vertexsnap.vertex_gizmos.children.forEach(function (s) {
        if (s.isVertex === true) {
          objects.push(s);
        }
      });
    }
    if (Animator.open && settings.motion_trails.value && Group.selected) {
      Animator.motion_trail.children.forEach((object) => {
        if (object.isKeyframe === true) {
          objects.push(object);
        }
      });
    }
    var intersects = this.raycaster.intersectObjects(objects);
    if (intersects.length > 0) {
      let mesh_gizmo = intersects.find(
        (intersect) =>
          intersect.object.type == "Points" ||
          intersect.object.type == "LineSegments"
      );
      let intersect = mesh_gizmo || intersects[0];
      let intersect_object = intersect.object;

      if (intersect_object.isElement) {
        var element = OutlinerNode.uuids[intersect_object.name];
        let face;
        if (element instanceof Cube) {
          face =
            intersect_object.geometry.faces[
              Math.floor(intersect.faceIndex / 2)
            ];
        } else if (element instanceof Mesh) {
          let index = intersect.faceIndex;
          for (let key in element.faces) {
            let { vertices } = element.faces[key];
            if (vertices.length < 3) continue;

            if (index == 0 || (index == 1 && vertices.length == 4)) {
              face = key;
              break;
            }
            if (vertices.length == 3) index -= 1;
            if (vertices.length == 4) index -= 2;
          }
        }

        return {
          type: "element",
          event,
          intersects,
          face,
          element,
        };
      } else if (intersect_object.isKeyframe) {
        let uuid = intersect_object.keyframeUUIDs[intersect.index];
        let keyframe = Timeline.keyframes.find((kf) => kf.uuid == uuid);
        return {
          event,
          type: "keyframe",
          intersects,
          keyframe: keyframe,
        };
      } else if (intersect_object.type == "Points") {
        var element = OutlinerNode.uuids[intersect_object.parent.parent.name];
        let vertex =
          element instanceof Mesh
            ? Object.keys(element.vertices)[intersect.index]
            : intersect_object.vertices[intersect.index];
        return {
          event,
          type: "vertex",
          element,
          intersects,
          intersect,
          vertex,
          vertex_index: intersect.index,
        };
      } else if (intersect_object.type == "LineSegments") {
        var element = OutlinerNode.uuids[intersect_object.parent.name];
        let vertices = intersect_object.vertex_order.slice(
          intersect.index,
          intersect.index + 2
        );
        return {
          event,
          type: "line",
          element,
          intersects,
          intersect,
          vertices,
        };
      }
    } else {
      return false;
    }
  }
  render() {
    this.controls.update();
    this.renderer.render(display_mode ? display_scene : scene, this.camera);
  }
  //Camera
  get camera() {
    return this.isOrtho ? this.camOrtho : this.camPers;
  }
  setProjectionMode(ortho, toggle) {
    let position = this.camera.position;
    this.isOrtho = !!ortho;
    this.resize();
    this.controls.object = this.camera;
    this.camera.position.copy(position);
    if (toggle) {
      let perspective_distance = this.camPers.position.distanceTo(
        this.controls.target
      );
      let factor = 0.64 * devicePixelRatio * this.camPers.getFocalLength();
      if (this.isOrtho) {
        this.camera.zoom = factor / perspective_distance;
      } else {
        let target_distance = factor / this.camOrtho.zoom;
        let cam_offset = new THREE.Vector3()
          .copy(this.camPers.position)
          .sub(this.controls.target);
        cam_offset.multiplyScalar(target_distance / perspective_distance);
        this.camPers.position.copy(cam_offset).add(this.controls.target);
      }
    }
    if (!this.offscreen) {
      this.setLockedAngle();
      this.controls.updateSceneScale();
    }
    if (this == Preview.selected) {
      this.occupyTransformer();
    }
    return this;
  }
  setFOV(fov) {
    this.camPers.fov = fov;
    this.camPers.updateProjectionMatrix();
  }
  setNormalCamera() {
    //Deprecated
    this.setProjectionMode(false);
    return this;
  }
  setLockedAngle(angle) {
    if (typeof angle === "string" && this.isOrtho) {
      this.angle = angle;
      this.controls.enableRotate = false;

      switch (angle) {
        case "top":
          this.camOrtho.axis = "y";
          this.camOrtho.backgroundHandle = [
            { n: false, a: "x" },
            { n: false, a: "z" },
          ];
          break;
        case "bottom":
          this.camOrtho.axis = "y";
          this.camOrtho.backgroundHandle = [
            { n: false, a: "x" },
            { n: true, a: "z" },
          ];
          break;
        case "south":
          this.camOrtho.axis = "z";
          this.camOrtho.backgroundHandle = [
            { n: false, a: "x" },
            { n: true, a: "y" },
          ];
          break;
        case "north":
          this.camOrtho.axis = "z";
          this.camOrtho.backgroundHandle = [
            { n: true, a: "x" },
            { n: true, a: "y" },
          ];
          break;
        case "east":
          this.camOrtho.axis = "x";
          this.camOrtho.backgroundHandle = [
            { n: true, a: "z" },
            { n: true, a: "y" },
          ];
          break;
        case "west":
          this.camOrtho.axis = "x";
          this.camOrtho.backgroundHandle = [
            { n: false, a: "z" },
            { n: true, a: "y" },
          ];
          break;
      }
      this.loadBackground();

      var layer = getAxisNumber(this.camOrtho.axis) + 1;
      this.camOrtho.layers.set(0);
      this.camOrtho.layers.enable(layer);
      for (var i = 1; i <= 3; i++) {
        if (i != layer) {
          this.camOrtho.layers.enable(i + 3);
        }
      }
      if (this.camOrtho.axis != "x") {
        this.controls.target.x = this.camOrtho.position.x =
          this.side_view_target.x;
      }
      if (this.camOrtho.axis != "y") {
        this.controls.target.y = this.camOrtho.position.y =
          this.side_view_target.y;
      }
      if (this.camOrtho.axis != "z") {
        this.controls.target.z = this.camOrtho.position.z =
          this.side_view_target.z;
      }
    } else {
      this.angle = null;
      this.camOrtho.axis = null;
      this.camOrtho.layers.set(0);
      this.camOrtho.layers.enable(4);
      this.camOrtho.layers.enable(5);
      this.camOrtho.layers.enable(6);
      this.resize();
      this.controls.enableRotate = true;
      this.loadBackground();
    }

    Transformer.update();
    this.loadBackground();
    return this;
  }
  setDefaultAnglePreset(preset) {
    this.default_angle = preset;
    this.loadAnglePreset(preset);
    return this;
  }
  loadAnglePreset(preset) {
    if (!preset) return;
    this.camera.position.fromArray(preset.position);
    if (preset.target) {
      this.controls.target.fromArray(preset.target);
    } else if (preset.rotation) {
      this.controls.target
        .set(0, 0, 16)
        .applyEuler(
          new THREE.Euler(
            Math.degToRad(preset.rotation[0]),
            Math.degToRad(preset.rotation[1]),
            Math.degToRad(preset.rotation[2]),
            "ZYX"
          )
        );
      this.controls.target.add(this.camera.position);
    }
    if (preset.projection !== "unset") {
      this.setProjectionMode(preset.projection == "orthographic");
    }
    if (this.isOrtho && preset.zoom && !preset.locked_angle) {
      this.camera.zoom = preset.zoom;
      this.camera.updateProjectionMatrix();
    }
    this.setLockedAngle(preset.locked_angle);
    return this;
  }
  newAnglePreset() {
    let scope = this;
    let position = scope.camera.position.toArray();
    let target = scope.controls.target.toArray();
    position.forEach((v, i) => {
      position[i] = Math.round(v * 100) / 100;
    });
    target.forEach((v, i) => {
      target[i] = Math.round(v * 100) / 100;
    });
    let rotation_mode = "target";

    let dialog = new Dialog({
      id: "save_angle",
      title: "menu.preview.save_angle",
      width: 540,
      form: {
        name: { label: "generic.name" },
        projection: {
          label: "dialog.save_angle.projection",
          type: "select",
          default: "unset",
          options: {
            unset: "generic.unset",
            perspective: "dialog.save_angle.projection.perspective",
            orthographic: "dialog.save_angle.projection.orthographic",
          },
        },
        divider1: "_",
        rotation_mode: {
          label: "dialog.save_angle.rotation_mode",
          type: "select",
          value: rotation_mode,
          options: {
            target: "dialog.save_angle.target",
            rotation: "dialog.save_angle.rotation",
          },
        },
        position: {
          label: "dialog.save_angle.position",
          type: "vector",
          dimensions: 3,
          value: position,
        },
        target: {
          label: "dialog.save_angle.target",
          type: "vector",
          dimensions: 3,
          value: target,
          condition: ({ rotation_mode }) => rotation_mode == "target",
        },
        rotation: {
          label: "dialog.save_angle.rotation",
          type: "vector",
          dimensions: 2,
          condition: ({ rotation_mode }) => rotation_mode == "rotation",
        },
        zoom: {
          label: "dialog.save_angle.zoom",
          type: "number",
          value: 1,
          condition: (result) => result.projection == "orthographic",
        },
      },
      onFormChange(form) {
        if (form.rotation_mode !== rotation_mode) {
          rotation_mode = form.rotation_mode;
          if (form.rotation_mode == "rotation") {
            this.setFormValues({
              rotation: cameraTargetToRotation(form.position, form.target).map(
                trimFloatNumber
              ),
            });
          } else {
            this.setFormValues({
              target: cameraRotationToTarget(form.position, form.rotation).map(
                trimFloatNumber
              ),
            });
          }
        }
      },
      onConfirm: function (formResult) {
        if (!formResult.name) return;

        let preset = {
          name: formResult.name,
          projection: formResult.projection,
          position: formResult.position,
          target: formResult.target,
        };
        if (this.isOrtho) preset.zoom = this.camOrtho.zoom;

        let presets = localStorage.getItem("camera_presets");
        try {
          presets = JSON.parse(presets) || [];
        } catch (err) {
          presets = [];
        }
        presets.push(preset);
        localStorage.setItem("camera_presets", JSON.stringify(presets));

        dialog.hide();
      },
    });
    dialog.show();
    return this;
  }
  //Orientation
  getFacingDirection() {
    var vec = new THREE.Vector3();
    this.controls.object.getWorldDirection(vec);
    vec.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4).ceil();
    switch (vec.x + "_" + vec.z) {
      case "1_1":
        return "south";
        break;
      case "0_0":
        return "north";
        break;
      case "1_0":
        return "east";
        break;
      case "0_1":
        return "west";
        break;
    }
  }
  getFacingHeight() {
    var y = this.controls.object.getWorldDirection(new THREE.Vector3()).y;
    if (y > 0.5) {
      return "up";
    } else if (y < -0.5) {
      return "down";
    } else {
      return "middle";
    }
  }
  //Controls
  click(event) {
    event.preventDefault();
    $(":focus").blur();
    if (open_menu) open_menu.hide();
    unselectInterface(event);
    convertTouchEvent(event);
    Preview.selected = this;
    this.static_rclick = event.which === 3 || event.type == "touchstart";

    if (event.type == "touchstart") {
      this.rclick_cooldown = setTimeout(() => {
        this.rclick_cooldown = true;
      }, 420);
      Transformer.dispatchPointerHover(event);
    }
    if (
      Transformer.hoverAxis !== null ||
      (!Keybinds.extra.preview_select.keybind.isTriggered(event) &&
        event.which !== 0)
    )
      return;

    var data = this.raycast(event);
    if (data) {
      this.selection.click_target = data;

      function unselectOtherNodes() {
        if (Group.selected) Group.selected.unselect();
        Outliner.elements.forEach((el) => {
          if (el !== data.element) Outliner.selected.remove(el);
        });
      }

      let select_mode = BarItems.selection_mode.value;

      if (data.element && data.element.locked) {
        $("#preview").css("cursor", "not-allowed");
        function resetCursor() {
          $("#preview").css(
            "cursor",
            Toolbox.selected.cursor ? Toolbox.selected.cursor : "default"
          );
          removeEventListeners(
            document,
            "mouseup touchend",
            resetCursor,
            false
          );
        }
        addEventListeners(document, "mouseup touchend", resetCursor, false);
      } else if (
        Toolbox.selected.selectElements &&
        Modes.selected.selectElements &&
        data.type === "element"
      ) {
        if (Toolbox.selected.selectFace && data.face) {
          if (
            data.element instanceof Mesh &&
            select_mode == "face" &&
            (event.ctrlOrCmd ||
              Pressing.overrides.ctrl ||
              event.shiftKey ||
              Pressing.overrides.shift)
          ) {
            UVEditor.vue.selected_faces.safePush(data.face);
          } else {
            UVEditor.setFace(data.face, false);
          }
        }
        Blockbench.dispatchEvent("canvas_select", data);
        if (Modes.paint) {
          event = 0;
        }
        if (
          data.element.parent.type === "group" &&
          (!data.element instanceof Mesh || select_mode == "object") &&
          (Animator.open ||
            event.shiftKey ||
            Pressing.overrides.shift ||
            (!Format.rotate_cubes &&
              Format.bone_rig &&
              ["rotate_tool", "pivot_tool"].includes(Toolbox.selected.id)))
        ) {
          if (
            data.element.parent.selected &&
            (event.shiftKey || Pressing.overrides.shift)
          ) {
            let super_parent = data.element.parent;
            while (
              super_parent.parent instanceof Group &&
              super_parent.selected
            ) {
              super_parent = super_parent.parent;
            }
            super_parent.select().showInOutliner();
          } else {
            data.element.parent.select().showInOutliner();
          }
        } else if (!Animator.open) {
          if (data.element instanceof Mesh && select_mode == "face") {
            if (!data.element.selected) data.element.select(event);

            if (
              !(
                event.ctrlOrCmd ||
                Pressing.overrides.ctrl ||
                event.shiftKey ||
                Pressing.overrides.shift
              )
            ) {
              unselectOtherNodes();
            }

            let mesh = data.element;
            let selected_vertices = mesh.getSelectedVertices(true);

            if (event.altKey || Pressing.overrides.alt) {
              let mesh = data.element;
              let start_face = mesh.faces[data.face];
              if (!start_face) return;
              let processed_faces = [];
              function selectFace(face, index) {
                if (processed_faces.includes(face)) return;
                processed_faces.push(face);
                if (
                  start_face.vertices.length == 4 &&
                  face.vertices.length != 4
                )
                  return;
                let next = face.getAdjacentFace(index);
                if (next) selectFace(next.face, next.index + 2);
              }

              let face_test = start_face.getAdjacentFace(1);
              let index = face_test && face_test.face.isSelected() ? 2 : 1;
              selectFace(start_face, index);
              if (start_face.vertices.length == 4) {
                processed_faces.remove(start_face);
                selectFace(start_face, (index + 2) % 4);
              }

              if (
                !(
                  event.ctrlOrCmd ||
                  Pressing.overrides.ctrl ||
                  event.shiftKey ||
                  Pressing.overrides.shift
                )
              ) {
                selected_vertices.empty();
                UVEditor.vue.selected_faces.empty();
              }

              processed_faces.forEach((face) => {
                Project.selected_vertices[data.element.uuid].safePush(
                  ...face.vertices
                );
                let fkey = face.getFaceKey();
                UVEditor.vue.selected_faces.push(fkey);
              });
            } else {
              if (
                !(
                  event.ctrlOrCmd ||
                  Pressing.overrides.ctrl ||
                  event.shiftKey ||
                  Pressing.overrides.shift
                )
              ) {
                selected_vertices.empty();
                UVEditor.vue.selected_faces.empty();
              }
              Project.selected_vertices[data.element.uuid].safePush(
                ...data.element.faces[data.face].vertices
              );
              UVEditor.vue.selected_faces.safePush(data.face);
            }
          } else {
            data.element.select(event);
          }
          updateSelection();
        }
      } else if (Animator.open && data.type == "keyframe") {
        if (data.keyframe instanceof Keyframe) {
          data.keyframe.select(event).callPlayhead();
          updateSelection();
        }
      } else if (
        data.type == "vertex" &&
        Toolbox.selected.id !== "vertex_snap_tool"
      ) {
        if (!Project.selected_vertices[data.element.uuid]) {
          Project.selected_vertices[data.element.uuid] = [];
        }
        let list = Project.selected_vertices[data.element.uuid];

        if (
          event.ctrlOrCmd ||
          Pressing.overrides.ctrl ||
          event.shiftKey ||
          Pressing.overrides.shift
        ) {
          list.toggle(data.vertex);
        } else {
          unselectOtherNodes();
          list.replace([data.vertex]);
        }
        updateSelection();
      } else if (data.type == "line") {
        if (!Project.selected_vertices[data.element.uuid]) {
          Project.selected_vertices[data.element.uuid] = [];
        }
        let list = Project.selected_vertices[data.element.uuid];

        if (
          event.ctrlOrCmd ||
          Pressing.overrides.ctrl ||
          event.shiftKey ||
          Pressing.overrides.shift
        ) {
          if (
            list.includes(data.vertices[0]) &&
            list.includes(data.vertices[1])
          ) {
            list.remove(...data.vertices);
          } else {
            list.remove(...data.vertices);
            list.push(...data.vertices);
          }
        } else {
          list.replace(data.vertices);
          unselectOtherNodes();
        }
        if (event.altKey || Pressing.overrides.alt) {
          let mesh = data.element;
          let start_face;
          for (let fkey in mesh.faces) {
            let face = mesh.faces[fkey];
            if (face.vertices.length < 3) continue;
            let vertices = face.vertices.filter((vkey) =>
              data.vertices.includes(vkey)
            );
            if (vertices.length >= 2) {
              start_face = face;
              break;
            }
          }
          if (!start_face) return;
          let processed_faces = [start_face];

          function splitFace(face, side_vertices) {
            processed_faces.push(face);
            let sorted_vertices = face.getSortedVertices();

            let side_index_diff =
              sorted_vertices.indexOf(side_vertices[0]) -
              sorted_vertices.indexOf(side_vertices[1]);
            if (side_index_diff == -1 || side_index_diff > 2)
              side_vertices.reverse();

            let opposite_vertices = sorted_vertices.filter(
              (vkey) => !side_vertices.includes(vkey)
            );
            let opposite_index_diff =
              sorted_vertices.indexOf(opposite_vertices[0]) -
              sorted_vertices.indexOf(opposite_vertices[1]);
            if (opposite_index_diff == 1 || opposite_index_diff < -2)
              opposite_vertices.reverse();

            list.safePush(...side_vertices);

            // Find next (and previous) face
            function doNextFace(index) {
              for (let fkey in mesh.faces) {
                let ref_face = mesh.faces[fkey];
                if (
                  ref_face.vertices.length < 3 ||
                  processed_faces.includes(ref_face)
                )
                  continue;

                let sorted_vertices = ref_face.getSortedVertices();
                let vertices = ref_face.vertices.filter(
                  (vkey) =>
                    vkey == side_vertices[index] ||
                    vkey == opposite_vertices[index]
                );

                if (vertices.length >= 2) {
                  let second_vertex = sorted_vertices.find((vkey, i) => {
                    return (
                      vkey !== side_vertices[index] &&
                      vkey !== opposite_vertices[index] &&
                      (sorted_vertices.length == 3 ||
                        Math.abs(
                          sorted_vertices.indexOf(side_vertices[index]) - i
                        ) !== 2)
                    );
                  });
                  splitFace(ref_face, [side_vertices[index], second_vertex]);
                  break;
                }
              }
            }
            doNextFace(0);
            doNextFace(1);
          }
          splitFace(start_face, data.vertices);
        }
        updateSelection();
      }
      if (typeof Toolbox.selected.onCanvasClick === "function") {
        Toolbox.selected.onCanvasClick(data);
        Blockbench.dispatchEvent("canvas_click", data);
      }
      return true;
    }
    if (typeof Toolbox.selected.onCanvasClick === "function") {
      Toolbox.selected.onCanvasClick({ event });
    }

    if (
      Keybinds.extra.preview_area_select.keybind.isTriggered(event) ||
      this.movingBackground
    ) {
      this.startSelRect(event);
    } else {
      return false;
    }
  }
  mousemove(event) {
    if (Settings.get("highlight_cubes")) {
      var data = this.raycast(event);
      updateCubeHighlights(data && data.element);
    }
  }
  mouseup(event) {
    this.showContextMenu(event);
    if (
      settings.canvas_unselect.value &&
      event.which != 2 &&
      this.controls.hasMoved === false &&
      !this.selection.activated &&
      !Transformer.dragging &&
      !this.selection.click_target
    ) {
      unselectAll();
    }
    delete this.selection.click_target;
    return this;
  }
  raycastMouseCoords(x, y) {
    var scope = this;
    var canvas_offset = $(scope.canvas).offset();
    scope.mouse.x = ((x - canvas_offset.left) / scope.width) * 2 - 1;
    scope.mouse.y = -((y - canvas_offset.top) / scope.height) * 2 + 1;
    scope.raycaster.setFromCamera(scope.mouse, scope.camOrtho);
    return scope.raycaster.ray.origin;
  }
  occupyTransformer(event) {
    if (this.offscreen || Transformer.dragging) return this;

    Transformer.camera = this.isOrtho ? this.camOrtho : this.camPers;
    Transformer.orbit_controls = this.controls;
    Transformer.setCanvas(this.canvas);
    main_preview.controls.updateSceneScale();
    if (quad_previews) {
      quad_previews.hovered = this;
    }
    if (event && event.type == "touchstart") {
      Transformer.simulateMouseDown(event);
    }
    return this;
  }
  showContextMenu(event) {
    Prop.active_panel = "preview";
    if (
      this.static_rclick &&
      (event.which === 3 ||
        (event.type == "touchend" && this.rclick_cooldown == true))
    ) {
      var data = this.raycast(event);
      if (data) this.selection.click_target = data;
      if (
        Toolbox.selected.selectElements &&
        Modes.selected.selectElements &&
        data &&
        data.element &&
        !Modes.animate
      ) {
        data.element.showContextMenu(event);
      } else if (data.type == "keyframe") {
        data.keyframe.showContextMenu(event);
      } else {
        this.menu.open(event, this);
      }
    }
    clearTimeout(this.rclick_cooldown);
    delete this.rclick_cooldown;
    return this;
  }
  calculateControlScale(position) {
    if (this.isOrtho) {
      return 0.35 / this.camera.zoom;
    } else {
      var scaleVector = new THREE.Vector3();
      var scale =
        scaleVector.subVectors(position, this.camera.position).length() / 4;
      scale *= this.camera.fov / this.height;
      return scale;
    }
  }
  //Selection Rectangle
  startSelRect(event) {
    var scope = this;
    if (Modes.edit || this.movingBackground) {
      this.sr_move_f = function (event) {
        scope.moveSelRect(event);
      };
      this.sr_stop_f = function (event) {
        scope.stopSelRect(event);
      };
      document.addEventListener("mousemove", this.sr_move_f, false);
      document.addEventListener("mouseup", this.sr_stop_f, false);
    }

    this.selection.start_x = event.offsetX + 0;
    this.selection.start_y = event.offsetY + 0;
    this.selection.client_x = event.clientX + 0;
    this.selection.client_y = event.clientY + 0;

    if (this.movingBackground) {
      this.background.before = {
        x: this.background.x,
        y: this.background.y,
        size: this.background.size,
      };
      return;
    }
    if (!Modes.edit || event.type == "touchstart") return;

    $(this.node).append(this.selection.box);
    this.selection.activated = false;
    this.selection.old_selected = Outliner.selected.slice();
    this.selection.old_vertices_selected = {};
    for (let uuid in Project.selected_vertices) {
      this.selection.old_vertices_selected[uuid] =
        Project.selected_vertices[uuid].slice();
    }

    this.moveSelRect(event);
  }
  moveSelRect(event) {
    var scope = this;

    if (this.movingBackground) {
      if (event.shiftKey || Pressing.overrides.shift) {
        let diff = event.clientY - this.selection.client_y;
        this.background.size = limitNumber(
          this.background.before.size +
            diff * (0.6 + this.background.size / 1200),
          0,
          10e3
        );
      } else {
        this.background.x =
          this.background.before.x + (event.clientX - this.selection.client_x);
        this.background.y =
          this.background.before.y + (event.clientY - this.selection.client_y);
      }
      this.updateBackground();
      return;
    }

    //Overlay
    var c = getRectangle(
      Math.clamp(this.selection.start_x, -2, this.width),
      Math.clamp(this.selection.start_y, -2, this.height),
      Math.clamp(
        this.selection.start_x + (event.clientX - this.selection.client_x),
        -2,
        this.width
      ),
      Math.clamp(
        this.selection.start_y + (event.clientY - this.selection.client_y),
        -2,
        this.height
      )
    );
    this.selection.box.css("left", c.ax + "px");
    this.selection.box.css("top", c.ay + "px");

    this.selection.box.css("width", c.x + "px");
    this.selection.box.css("height", c.y + "px");

    if (c.x + c.y > 40) {
      this.selection.activated = true;
    }

    //Select
    if (!this.selection.activated) return;

    let vector = new THREE.Vector3();
    let rect_start = [c.ax, c.ay];
    let rect_end = [c.bx, c.by];
    let extend_selection =
      event.shiftKey ||
      event.ctrlOrCmd ||
      Pressing.overrides.ctrl ||
      Pressing.overrides.shift;
    let selection_mode = BarItems.selection_mode.value;

    let widthHalf = (0.5 * scope.canvas.width) / window.devicePixelRatio;
    let heightHalf = (0.5 * scope.canvas.height) / window.devicePixelRatio;

    function projectPoint(vector) {
      vector.project(scope.camera);
      return [
        vector.x * widthHalf + widthHalf,
        -(vector.y * heightHalf) + heightHalf,
      ];
    }

    unselectAll();
    Outliner.elements.forEach((element) => {
      let isSelected;
      if (
        extend_selection &&
        scope.selection.old_selected.includes(element) &&
        (element instanceof Mesh == false || selection_mode == "object")
      ) {
        isSelected = true;
      } else if (element.visibility) {
        if (element.mesh && element.mesh.geometry) {
          let { mesh } = element;

          if (
            element instanceof Mesh &&
            (selection_mode == "object" ||
              scope.selection.old_selected.includes(element))
          ) {
            let selected_vertices;
            if (selection_mode != "object") {
              isSelected = true;
              if (!Project.selected_vertices[element.uuid]) {
                selected_vertices = Project.selected_vertices[element.uuid] =
                  [];
              } else {
                selected_vertices = Project.selected_vertices[element.uuid];
              }
              if (!extend_selection) selected_vertices.empty();
            }

            let vertex_points = {};
            for (let vkey in element.vertices) {
              let point = projectPoint(
                mesh.localToWorld(vector.fromArray(element.vertices[vkey]))
              );
              vertex_points[vkey] = point;
            }
            if (selection_mode == "vertex") {
              for (let vkey in element.vertices) {
                let point = vertex_points[vkey];
                if (
                  (extend_selection &&
                    this.selection.old_vertices_selected[element.uuid] &&
                    this.selection.old_vertices_selected[element.uuid].includes(
                      vkey
                    )) ||
                  pointInRectangle(point, rect_start, rect_end)
                ) {
                  selected_vertices.safePush(vkey);
                }
              }
            } else if (selection_mode == "edge") {
              for (let fkey in element.faces) {
                let face = element.faces[fkey];
                let vertices = face.getSortedVertices();
                for (let i = 0; i < vertices.length; i++) {
                  let vkey = vertices[i];
                  let vkey2 = vertices[i + 1] || vertices[0];
                  let p1 = vertex_points[vkey];
                  let p2 = vertex_points[vkey2];
                  if (lineIntersectsReactangle(p1, p2, rect_start, rect_end)) {
                    selected_vertices.safePush(vkey);
                  }
                }
              }
            } else {
              for (let fkey in element.faces) {
                let face = element.faces[fkey];
                let vertices = face.getSortedVertices();
                let face_intersects;
                for (let i = 0; i < vertices.length; i++) {
                  let vkey = vertices[i];
                  let vkey2 = vertices[i + 1] || vertices[0];
                  let p1 = vertex_points[vkey];
                  let p2 = vertex_points[vkey2];
                  if (lineIntersectsReactangle(p1, p2, rect_start, rect_end)) {
                    face_intersects = true;
                    break;
                  }
                }
                if (face_intersects && selection_mode == "object") {
                  if (face_intersects) {
                    isSelected = true;
                    break;
                  }
                } else {
                  if (face_intersects) {
                    selected_vertices.safePush(...face.vertices);
                    UVEditor.vue.selected_faces.safePush(fkey);
                  } else {
                    UVEditor.vue.selected_faces.remove(fkey);
                  }
                }
              }
            }
          } else if (
            element instanceof Cube &&
            (selection_mode == "object" ||
              !Format.meshes ||
              !scope.selection.old_selected.find((el) => el instanceof Mesh))
          ) {
            let vertices = [
              [
                element.from[0] - element.inflate,
                element.from[1] - element.inflate,
                element.from[2] - element.inflate,
              ],
              [
                element.from[0] - element.inflate,
                element.from[1] - element.inflate,
                element.to[2] + element.inflate,
              ],
              [
                element.from[0] - element.inflate,
                element.to[1] + element.inflate,
                element.to[2] + element.inflate,
              ],
              [
                element.from[0] - element.inflate,
                element.to[1] + element.inflate,
                element.from[2] - element.inflate,
              ],
              [
                element.to[0] + element.inflate,
                element.from[1] - element.inflate,
                element.from[2] - element.inflate,
              ],
              [
                element.to[0] + element.inflate,
                element.from[1] - element.inflate,
                element.to[2] + element.inflate,
              ],
              [
                element.to[0] + element.inflate,
                element.to[1] + element.inflate,
                element.to[2] + element.inflate,
              ],
              [
                element.to[0] + element.inflate,
                element.to[1] + element.inflate,
                element.from[2] - element.inflate,
              ],
            ].map((coords) => {
              coords.V3_subtract(element.origin);
              vector.fromArray(coords);
              mesh.localToWorld(vector);
              return projectPoint(vector);
            });
            isSelected =
              lineIntersectsReactangle(
                vertices[0],
                vertices[1],
                rect_start,
                rect_end
              ) ||
              lineIntersectsReactangle(
                vertices[1],
                vertices[2],
                rect_start,
                rect_end
              ) ||
              lineIntersectsReactangle(
                vertices[2],
                vertices[3],
                rect_start,
                rect_end
              ) ||
              lineIntersectsReactangle(
                vertices[3],
                vertices[0],
                rect_start,
                rect_end
              ) ||
              lineIntersectsReactangle(
                vertices[4],
                vertices[5],
                rect_start,
                rect_end
              ) ||
              lineIntersectsReactangle(
                vertices[5],
                vertices[6],
                rect_start,
                rect_end
              ) ||
              lineIntersectsReactangle(
                vertices[6],
                vertices[7],
                rect_start,
                rect_end
              ) ||
              lineIntersectsReactangle(
                vertices[7],
                vertices[4],
                rect_start,
                rect_end
              ) ||
              lineIntersectsReactangle(
                vertices[0],
                vertices[4],
                rect_start,
                rect_end
              ) ||
              lineIntersectsReactangle(
                vertices[1],
                vertices[5],
                rect_start,
                rect_end
              ) ||
              lineIntersectsReactangle(
                vertices[2],
                vertices[6],
                rect_start,
                rect_end
              ) ||
              lineIntersectsReactangle(
                vertices[3],
                vertices[7],
                rect_start,
                rect_end
              );
          }
        } else if (element.mesh) {
          element.mesh.getWorldPosition(vector);
          isSelected = pointInRectangle(
            projectPoint(vector),
            rect_start,
            rect_end
          );
        }
      }
      if (isSelected) {
        element.selectLow();
      }
    });
    TickUpdates.selection = true;
  }
  stopSelRect(event) {
    document.removeEventListener("mousemove", this.sr_move_f);
    document.removeEventListener("mouseup", this.sr_stop_f);
    if (this.movingBackground) {
      delete this.background.before;
      return;
    }
    this.selection.box.detach();
    this.selection.activated = false;
  }

  //Backgrounds
  getBackground() {
    if (display_mode) {
      var id = displayReferenceObjects.active.id;
      if (id == "monitor" || id == "bow") {
        this.background = canvas_scenes.monitor;
      } else if (["inventory_nine", "inventory_full", "hud"].includes(id)) {
        this.background = canvas_scenes[id];
      } else {
        this.background = canvas_scenes.normal;
      }
    } else if (this.angle !== null) {
      this.background = Project && Project.backgrounds["ortho_" + this.angle];
    } else {
      this.background = Project && Project.backgrounds.normal;
    }
    return this.background;
  }
  loadBackground() {
    this.getBackground();
    if (this.background && this.background.image) {
      let background_image = `url("${this.background.image
        .replace(/\\/g, "/")
        .replace(/#/g, "%23")}")`;
      this.canvas.style.setProperty("background-image", background_image);
      this.node
        .querySelector(".preview_background_menu")
        .style.setProperty("background-image", background_image);
      this.node.querySelector(".preview_background_menu").style.display =
        "block";
    } else {
      this.canvas.style.setProperty("background-image", "none");
      this.node.querySelector(".preview_background_menu").style.display =
        "none";
    }
    this.updateBackground();
    return this;
  }
  updateBackground() {
    if (!this.background) return;
    var bg = this.background;
    var zoom = this.angle !== null && bg.lock === true ? this.camOrtho.zoom : 1;
    var pos_x = 0;
    var pos_y = 0;
    if (this.angle !== null && bg.lock !== false) {
      pos_x = this.camOrtho.backgroundHandle[0].n === true ? 1 : -1;
      pos_x *=
        this.controls.target[this.camOrtho.backgroundHandle[0].a] * zoom * 40;
      pos_y = this.camOrtho.backgroundHandle[1].n === true ? 1 : -1;
      pos_y *=
        this.controls.target[this.camOrtho.backgroundHandle[1].a] * zoom * 40;
    }
    pos_x += bg.x * zoom + this.width / 2 - (bg.size * zoom) / 2;
    pos_y +=
      bg.y * zoom + this.height / 2 - ((bg.size / bg.ratio || 1) * zoom) / 2;

    this.canvas.style.setProperty("background-position-x", pos_x + "px");
    this.canvas.style.setProperty("background-position-y", pos_y + "px");
    this.canvas.style.setProperty("background-size", bg.size * zoom + "px");
    return this;
  }
  clearBackground() {
    this.loadBackground();
    this.background.image = false;
    this.background.size = limitNumber(this.background.size, 100, 2400);
    this.background.x = limitNumber(this.background.x, 0, this.width - 30);
    this.background.y = limitNumber(this.background.y, 0, this.height - 30);
    this.loadBackground();
    Settings.saveLocalStorages();
    return this;
  }
  restoreBackground() {
    this.loadBackground();
    if (this.background && this.background.defaults) {
      this.background.image = this.background.defaults.image || false;
      this.background.size = this.background.defaults.size || 1000;
      this.background.x = this.background.defaults.x || 0;
      this.background.y = this.background.defaults.y || 0;
    }
    this.loadBackground();
    Settings.saveLocalStorages();
    return this;
  }
  startMovingBackground() {
    if (this.movingBackground) {
      this.stopMovingBackground();
    }
    this.movingBackground = true;
    this.controls.enabled_before = this.controls.enabled;
    this.controls.enabled = false;

    this.position_toast = Blockbench.showToastNotification({
      text: "message.drag_background",
      icon: "open_with",
      click: () => {
        this.stopMovingBackground();
        return true;
      },
    });
    Interface.addSuggestedModifierKey(
      "shift",
      "modifier_actions.resize_background"
    );
  }
  stopMovingBackground() {
    this.movingBackground = false;
    this.controls.enabled = this.controls.enabled_before;
    delete this.controls.enabled_before;
    if (this.position_toast) {
      this.position_toast.delete();
      delete this.position_toast;
    }
    Interface.removeSuggestedModifierKey(
      "shift",
      "modifier_actions.resize_background"
    );
    Settings.saveLocalStorages();
    return this;
  }
  backgroundPositionDialog() {
    var scope = this;
    if (this.movingBackground) {
      this.stopMovingBackground();
    }
    var dialog = new Dialog({
      id: "background_position",
      title: tl("message.set_background_position.title"),
      lines: [
        `<div class="dialog_bar">
                      <input type="number" class="dark_bordered" value="${scope.background.x}" id="background_pos_x">
                      <input type="number" class="dark_bordered" value="${scope.background.y}" id="background_pos_y">
                      <input type="number" class="dark_bordered" value="${scope.background.size}" id="background_size">
                  </div>`,
      ],
      onConfirm: function () {
        var coords = [
          parseFloat($(dialog.object).find("#background_pos_x").val()),
          parseFloat($(dialog.object).find("#background_pos_y").val()),
          parseFloat($(dialog.object).find("#background_size").val()),
        ];
        dialog.hide();
        if (!scope.background) return;

        if (!isNaN(coords[0])) {
          scope.background.x = coords[0];
        }
        if (!isNaN(coords[1])) {
          scope.background.y = coords[1];
        }
        if (!isNaN(coords[2])) {
          scope.background.size = coords[2];
        }

        scope.updateBackground();
        Settings.saveLocalStorages();
      },
    });
    dialog.show();
  }
  //Misc
  screenshot(options, cb) {
    return Screencam.screenshotPreview(this, options, cb);
  }
  fullscreen() {
    if (quad_previews.current) {
      quad_previews.current.controls.stopMovement();
    }
    Preview.selected = this;
    quad_previews.enabled = false;
    $("#preview").empty();

    var wrapper = $('<div class="single_canvas_wrapper"></div>');
    wrapper.append(this.node);
    $("#preview").append(wrapper);

    Preview.all.forEach(function (prev) {
      if (prev.canvas.isConnected) {
        prev.resize();
      }
    });
    if (Interface.data) {
      updateInterfacePanels();
    }
    return this;
  }
  toggleFullscreen() {
    if (quad_previews.enabled) {
      this.fullscreen();
    } else {
      openQuadView();
    }
  }
  delete() {
    this.renderer.dispose();
    this.canvas.remove();
    this.node.remove();
    Blockbench.removeDragHandler("preview_" + this.id);
    if (Preview.selected == this) {
      Preview.selected = Preview.all.find(
        (preview) => preview.canvas.isConnected
      );
    }
    Preview.all.remove(this);
  }
}

Preview.prototype.menu = new Menu([
  "screenshot_model",
  {
    icon: "icon-player",
    name: "settings.display_skin",
    condition: () =>
      display_mode && displayReferenceObjects.active.id === "player",
    click: function () {
      changeDisplaySkin();
    },
  },
  "preview_checkerboard",
  {
    id: "background",
    icon: "wallpaper",
    name: "menu.preview.background",
    children(preview) {
      var has_background = !!preview.background.image;
      function applyBackground(image) {
        preview.background.image = image;
        preview.loadBackground();
        Settings.saveLocalStorages();
        preview.startMovingBackground();
      }
      return [
        {
          icon: "folder",
          name: "menu.preview.background.load",
          click: function (preview) {
            Blockbench.import(
              {
                resource_id: "preview_background",
                extensions: ["png", "jpg", "jpeg", "bmp", "tiff", "tif", "gif"],
                type: "Image",
                readtype: "image",
              },
              function (files) {
                if (files) {
                  applyBackground(isApp ? files[0].path : files[0].content);
                }
              },
              "image",
              false
            );
          },
        },
        {
          icon: "fa-clipboard",
          name: "menu.preview.background.clipboard",
          click: function (preview) {
            if (isApp) {
              var image = clipboard.readImage().toDataURL();
              if (image.length > 32) applyBackground(image);
            } else {
              navigator.clipboard.read().then((content) => {
                if (
                  content &&
                  content[0] &&
                  content[0].types.includes("image/png")
                ) {
                  content[0].getType("image/png").then((blob) => {
                    let url = URL.createObjectURL(blob);
                    if (image.length > 32) applyBackground(url);
                  });
                }
              });
            }
          },
        },
        {
          icon: "photo_size_select_large",
          name: "menu.preview.background.position",
          condition: has_background,
          click: function (preview) {
            preview.startMovingBackground();
          },
        },
        {
          icon: "photo_size_select_large",
          name: "menu.preview.background.set_position",
          condition: has_background,
          click: function (preview) {
            preview.backgroundPositionDialog();
          },
        },
        {
          name: "menu.preview.background.lock",
          condition:
            has_background &&
            preview.background.lock !== null &&
            preview.angle !== null,
          icon: preview.background.lock
            ? "check_box"
            : "check_box_outline_blank",
          click: function (preview) {
            preview.background.lock = !preview.background.lock;
            preview.updateBackground();
          },
        },
        {
          icon: "clear",
          name: "generic.remove",
          condition: has_background,
          click: function (preview) {
            preview.clearBackground();
          },
        },
        {
          icon: "restore",
          name: "generic.restore",
          condition: (preview) =>
            preview.background && preview.background.defaults.image,
          click: function (preview) {
            preview.restoreBackground();
          },
        },
      ];
    },
  },
  "_",
  "focus_on_selection",
  {
    icon: "add_a_photo",
    name: "menu.preview.save_angle",
    condition(preview) {
      return !preview.movingBackground && !Modes.display;
    },
    click(preview) {
      preview.newAnglePreset();
    },
  },
  {
    id: "angle",
    icon: "videocam",
    name: "menu.preview.angle",
    condition(preview) {
      return !preview.movingBackground && !Modes.display;
    },
    children: function (preview) {
      var children = [];
      let presets = localStorage.getItem("camera_presets");
      presets = (presets && autoParseJSON(presets, false)) || [];
      let all_presets = [
        DefaultCameraPresets[0],
        "_",
        ...DefaultCameraPresets.slice(1, 7),
        "_",
        ...DefaultCameraPresets.slice(7, 11),
        "_",
        ...DefaultCameraPresets.slice(11),
        "_",
        ...presets,
      ];

      all_presets.forEach((preset) => {
        if (typeof preset == "string") {
          children.push("_");
          return;
        }
        let icon = typeof preset.locked_angle
          ? "videocam"
          : preset.locked_angle == preview.angle
          ? "radio_button_checked"
          : "radio_button_unchecked";
        children.push({
          name: preset.name,
          color: preset.color,
          id: preset.name,
          preset,
          icon,
          click: preset.default
            ? () => {
                preview.loadAnglePreset(preset);
              }
            : null,
          children: !preset.default && [
            {
              icon: "check_circle",
              name: "menu.preview.angle.load",
              click() {
                preview.loadAnglePreset(preset);
              },
            },
            {
              icon: "edit",
              name: "menu.preview.angle.edit",
              click() {
                editCameraPreset(preset, presets);
              },
            },
            {
              icon: "delete",
              name: "generic.delete",
              click() {
                presets.remove(preset);
                localStorage.setItem("camera_presets", JSON.stringify(presets));
              },
            },
          ],
        });
      });

      return children;
    },
  },
  {
    icon: (preview) =>
      preview.isOrtho ? "check_box" : "check_box_outline_blank",
    name: "menu.preview.orthographic",
    click: function (preview) {
      preview.setProjectionMode(!preview.isOrtho, true);
    },
  },
  "_",
  {
    icon: "grid_view",
    name: "menu.preview.quadview",
    condition: function (preview) {
      return (
        !quad_previews.enabled &&
        !preview.movingBackground &&
        !Modes.display &&
        !Animator.open
      );
    },
    click: function () {
      openQuadView();
    },
  },
  {
    icon: "web_asset",
    name: "menu.preview.maximize",
    condition: function (preview) {
      return (
        quad_previews.enabled && !preview.movingBackground && !Modes.display
      );
    },
    click: function (preview) {
      preview.fullscreen();
    },
  },
  {
    icon: "cancel",
    color: "x",
    name: "menu.preview.stop_drag",
    condition: function (preview) {
      return preview.movingBackground;
    },
    click: function (preview) {
      preview.stopMovingBackground();
    },
  },
]);

Preview.all = [];
