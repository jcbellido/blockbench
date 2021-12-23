var scene;
var main_preview;
var MediaPreview;
var Sun;
var lights;
var outlines;
var Transformer;
var canvas_scenes;
var display_scene;
var display_area;
var display_base;
var framespersecond = 0;
var display_mode = false;
var doRender = false;
var quad_previews = {};
const three_grid = new THREE.Object3D();
const rot_origin = new THREE.Object3D();
var gizmo_colors = {
  r: new THREE.Color(0xfd3043),
  g: new THREE.Color(0x26ec45),
  b: new THREE.Color(0x2d5ee8),
  grid: new THREE.Color(0x495061),
  wire: new THREE.Color(0x576f82),
  solid: new THREE.Color(0xc1c1c1),
  outline: new THREE.Color(0x3e90ff),
};

const DefaultCameraPresets = [
  {
    name: "menu.preview.angle.initial",
    id: "initial",
    projection: "perspective",
    position: [-40, 32, -40],
    target: [0, 8, 0],
    default: true,
  },
  {
    name: "direction.top",
    id: "top",
    projection: "orthographic",
    color: "y",
    position: [0, 64, 0],
    target: [0, 0, 0],
    zoom: 0.5,
    locked_angle: "top",
    default: true,
  },
  {
    name: "direction.bottom",
    id: "bottom",
    projection: "orthographic",
    color: "y",
    position: [0, -64, 0],
    target: [0, 0, 0],
    zoom: 0.5,
    locked_angle: "bottom",
    default: true,
  },
  {
    name: "direction.south",
    id: "south",
    projection: "orthographic",
    color: "z",
    position: [0, 0, 64],
    target: [0, 0, 0],
    zoom: 0.5,
    locked_angle: "south",
    default: true,
  },
  {
    name: "direction.north",
    id: "north",
    projection: "orthographic",
    color: "z",
    position: [0, 0, -64],
    target: [0, 0, 0],
    zoom: 0.5,
    locked_angle: "north",
    default: true,
  },
  {
    name: "direction.east",
    id: "east",
    projection: "orthographic",
    color: "x",
    position: [64, 0, 0],
    target: [0, 0, 0],
    zoom: 0.5,
    locked_angle: "east",
    default: true,
  },
  {
    name: "direction.west",
    id: "west",
    projection: "orthographic",
    color: "x",
    position: [-64, 0, 0],
    target: [0, 0, 0],
    zoom: 0.5,
    locked_angle: "west",
    default: true,
  },
  {
    name: "camera_angle.common_isometric_right",
    id: "isometric_right",
    projection: "orthographic",
    position: [-64, 64 * 0.8165 + 8, -64],
    target: [0, 8, 0],
    zoom: 0.5,
    default: true,
  },
  {
    name: "camera_angle.common_isometric_left",
    id: "isometric_left",
    projection: "orthographic",
    position: [64, 64 * 0.8165 + 8, -64],
    target: [0, 8, 0],
    zoom: 0.5,
    default: true,
  },
  {
    name: "camera_angle.true_isometric_right",
    id: "isometric_right",
    projection: "orthographic",
    position: [-64, 64 + 8, -64],
    target: [0, 8, 0],
    zoom: 0.5,
    default: true,
  },
  {
    name: "camera_angle.true_isometric_left",
    id: "isometric_left",
    projection: "orthographic",
    position: [64, 64 + 8, -64],
    target: [0, 8, 0],
    zoom: 0.5,
    default: true,
  },
];

Blockbench.on("update_camera_position", (e) => {
  let scale = Preview.selected.calculateControlScale(
    new THREE.Vector3(0, 0, 0)
  );
  Preview.all.forEach((preview) => {
    if (preview.canvas.isConnected) {
      preview.raycaster.params.Points.threshold = scale * 0.8;
      preview.raycaster.params.Line.threshold = scale * 0.42;
    }
  });
});

function openQuadView() {
  quad_previews.enabled = true;

  $("#preview").empty();

  var wrapper1 = $('<div class="quad_canvas_wrapper qcw_x qcw_y"></div>');
  wrapper1.append(quad_previews.one.node);
  $("#preview").append(wrapper1);

  var wrapper2 = $('<div class="quad_canvas_wrapper qcw_y"></div>');
  wrapper2.append(quad_previews.two.node);
  $("#preview").append(wrapper2);

  var wrapper3 = $('<div class="quad_canvas_wrapper qcw_x"></div>');
  wrapper3.append(quad_previews.three.node);
  $("#preview").append(wrapper3);

  var wrapper4 = $('<div class="quad_canvas_wrapper"></div>');
  wrapper4.append(quad_previews.four.node);
  $("#preview").append(wrapper4);

  updateInterface();
}

function editCameraPreset(preset, presets) {
  let { name, projection, position, target, zoom } = preset;
  let rotation_mode = "target";

  let dialog = new Dialog({
    id: "edit_angle",
    title: "menu.preview.angle.edit",
    form: {
      name: { label: "generic.name", value: name },
      projection: {
        label: "dialog.save_angle.projection",
        type: "select",
        value: projection,
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
        value: zoom || 1,
        condition: (result) => result.projection == "orthographic",
      },
    },
    onFormChange(form) {
      if (form.rotation_mode !== rotation_mode) {
        rotation_mode = form.rotation_mode;
        if (form.rotation_mode == "rotation") {
          this.setFormValues({
            rotation: cameraTargetToRotation(form.position, form.target),
          });
        } else {
          this.setFormValues({
            target: cameraRotationToTarget(form.position, form.rotation),
          });
        }
      }
    },
    onConfirm: function (result) {
      if (!result.name) return;

      preset.name = result.name;
      preset.projection = result.projection;
      preset.position = result.position;
      preset.target =
        result.rotation_mode == "rotation"
          ? rotationToTarget(result.position, result.rotation)
          : result.target;
      if (result.projection == "orthographic") preset.zoom = result.zoom;

      localStorage.setItem("camera_presets", JSON.stringify(presets));
      dialog.hide();
    },
  });
  dialog.show();
}

class OrbitGizmo {
  constructor(preview, options = {}) {
    let scope = this;
    this.preview = preview;
    this.node = document.createElement("div");
    this.node.classList.add("orbit_gizmo");

    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.node.append(svg);
    this.lines = {
      x: document.createElementNS("http://www.w3.org/2000/svg", "path"),
      y: document.createElementNS("http://www.w3.org/2000/svg", "path"),
      z: document.createElementNS("http://www.w3.org/2000/svg", "path"),
    };
    for (let axis in this.lines) {
      this.lines[axis].setAttribute("axis", axis);
      svg.append(this.lines[axis]);
    }

    this.sides = {
      top: { opposite: "bottom", axis: "y", sign: 1, label: "Y" },
      bottom: { opposite: "top", axis: "y", sign: -1 },
      east: { opposite: "west", axis: "x", sign: 1, label: "X" },
      west: { opposite: "east", axis: "x", sign: -1 },
      south: { opposite: "north", axis: "z", sign: 1, label: "Z" },
      north: { opposite: "south", axis: "z", sign: -1 },
    };
    for (let key in this.sides) {
      let side = this.sides[key];
      side.node = document.createElement("div");
      side.node.classList.add("orbit_gizmo_side");
      side.node.setAttribute("axis", side.axis);
      side.node.title = tl(`direction.${key}`);
      if (side.label) side.node.innerText = side.label;

      side.node.addEventListener("click", (e) => {
        if (!this.preview.controls.enabled) return;
        let preset_key = key == this.preview.angle ? side.opposite : key;
        let preset = DefaultCameraPresets.find((p) => p.id == preset_key);
        this.preview.loadAnglePreset(preset);
      });
      this.node.append(side.node);
    }

    // Interact
    addEventListeners(this.node, "mousedown touchstart", (e1) => {
      if (
        (!scope.preview.controls.enableRotate && scope.preview.angle == null) ||
        !scope.preview.controls.enabled ||
        (scope.preview.force_locked_angle &&
          scope.preview.locked_angle !== null)
      )
        return;
      convertTouchEvent(e1);
      let last_event = e1;
      let move_calls = 0;

      let started = false;
      function start() {
        started = true;
        scope.node.classList.add("mouse_active");
        if (!e1.touches && last_event == e1 && scope.node.requestPointerLock)
          scope.node.requestPointerLock();
        if (scope.preview.angle != null) {
          scope.preview.setProjectionMode(false, true);
        }
      }

      function move(e2) {
        convertTouchEvent(e2);
        if (
          !started &&
          Math.pow(e2.clientX - e1.clientX, 2) +
            Math.pow(e2.clientY - e1.clientY, 2) >
            12
        ) {
          start();
        }
        if (started) {
          let limit = move_calls <= 2 ? 1 : 32;
          scope.preview.controls.rotateLeft(
            (e1.touches
              ? e2.clientX - last_event.clientX
              : Math.clamp(e2.movementX, -limit, limit)) / 40
          );
          scope.preview.controls.rotateUp(
            (e1.touches
              ? e2.clientY - last_event.clientY
              : Math.clamp(e2.movementY, -limit, limit)) / 40
          );
          last_event = e2;
          move_calls++;
        }
      }
      function off(e2) {
        if (document.exitPointerLock) document.exitPointerLock();
        removeEventListeners(document, "mousemove touchmove", move);
        removeEventListeners(document, "mouseup touchend", off);
        scope.node.classList.remove("mouse_active");
      }
      addEventListeners(document, "mouseup touchend", off);
      addEventListeners(document, "mousemove touchmove", move);
    });
    this.node.addEventListener("dblclick", (e) => {
      if (e.target != this.node) return;
      this.preview.setProjectionMode(!this.preview.isOrtho, true);
    });

    this.preview.controls.onUpdate((e) => this.update(e));

    this.update();
  }
  update() {
    let background = "background";
    let x = this.preview.controls.getPolarAngle();
    let y = this.preview.controls.getAzimuthalAngle();
    let mid = 40;
    let rad = 28;
    let scale = 0.16;
    let offset = {
      x: [Math.cos(y), Math.cos(x) * Math.sin(y), Math.sin(y)],
      y: [0, -Math.sin(x), Math.cos(x)],
      z: [-Math.sin(y), Math.cos(x) * Math.cos(y), Math.cos(y)],
    };

    for (let key in this.sides) {
      let side = this.sides[key];
      let vec = offset[side.axis];
      side.node.style.left = `${mid + side.sign * rad * vec[0]}px`;
      side.node.style.top = `${mid + side.sign * rad * vec[1]}px`;
      side.node.style.setProperty(
        "transform",
        `scale(${1 + scale * side.sign * vec[2]})`
      );
      side.node.classList.toggle(background, vec[2] * side.sign < 0);
    }

    for (let axis in this.lines) {
      let vec = offset[axis];
      this.lines[axis].setAttribute(
        "d",
        `M${mid} ${mid} L${mid + rad * vec[0]} ${mid + rad * vec[1]}`
      );
    }
  }
  hide() {
    this.node.style.display = "none";
  }
  unhide() {
    this.node.style.display = "block";
  }
}

window.addEventListener("gamepadconnected", function (event) {
  if (
    event.gamepad.id.includes("SpaceMouse") ||
    event.gamepad.id.includes("SpaceNavigator") ||
    event.gamepad.id.includes("3Dconnexion")
  ) {
    let interval = setInterval(() => {
      let gamepad = navigator.getGamepads()[event.gamepad.index];
      let preview = Preview.selected;
      if (
        !document.hasFocus() ||
        !preview ||
        !gamepad ||
        !gamepad.axes ||
        gamepad.axes.allEqual(0) ||
        gamepad.axes.find((v) => isNaN(v)) != undefined
      )
        return;

      let offset = new THREE.Vector3(
        gamepad.axes[0],
        -gamepad.axes[2],
        gamepad.axes[1]
      );
      offset.multiplyScalar(3);
      offset.applyQuaternion(preview.camera.quaternion);

      preview.controls.target.add(offset);
      preview.camera.position.add(offset);

      let camera_diff = new THREE.Vector3()
        .copy(preview.controls.target)
        .sub(preview.camera.position);
      let axes = [gamepad.axes[3] / -40, gamepad.axes[5] / -40];
      camera_diff.applyAxisAngle(THREE.NormalY, axes[1]);
      let tilt_axis = new THREE.Vector3().copy(camera_diff).normalize();
      tilt_axis.applyAxisAngle(THREE.NormalY, Math.PI / 2);
      tilt_axis.y = 0;
      camera_diff.applyAxisAngle(tilt_axis, axes[0]);

      preview.controls.target.copy(camera_diff).add(preview.camera.position);

      main_preview.controls.updateSceneScale();
    }, 16);

    window.addEventListener("gamepadconnected", function (event2) {
      if (
        event2.gamepad.id == event.gamepad.id &&
        event2.gamepad.index == event.gamepad.index
      ) {
        clearInterval(interval);
      }
    });
  }
});

class PreviewBackground {
  constructor(data = {}) {
    this.name = data.name ? tl(data.name) : "";
    this._image = data.image || false;
    this.size = data.size || 1000;
    this.x = data.x || 0;
    this.y = data.y || 0;
    this.lock = data.lock || false;
    this.defaults = Object.assign({}, this);
    this.defaults.image = this.image;
    this.imgtag = new Image();
  }
  get image() {
    return this._image;
  }
  set image(path) {
    this._image = path;
    if (typeof this._image == "string") {
      this.imgtag.src = this._image.replace(/#/g, "%23");
    }
  }
  getSaveCopy() {
    let dataUrl;

    if (isApp && this.image && this.image.substr(0, 5) != "data:") {
      let canvas = document.createElement("canvas");
      canvas.width = this.imgtag.naturalWidth;
      canvas.height = this.imgtag.naturalHeight;
      let ctx = canvas.getContext("2d");
      ctx.drawImage(this.imgtag, 0, 0);
      dataUrl = canvas.toDataURL("image/png");
    }

    return {
      name: this.name,
      image: dataUrl || this.image,
      size: this.size,
      x: this.x,
      y: this.y,
      lock: this.lock,
    };
  }
}

//Init/Update
function initCanvas() {
  //Objects
  scene = Canvas.scene = new THREE.Scene();
  display_scene = new THREE.Scene();
  display_area = new THREE.Object3D();
  display_base = new THREE.Object3D();

  display_scene.add(display_area);
  display_area.add(display_base);

  scene.name = "scene";
  display_base.name = "display_base";
  display_area.name = "display_area";
  display_scene.name = "display_scene";

  scene.add(Vertexsnap.vertex_gizmos);
  Vertexsnap.vertex_gizmos.name = "vertex_handles";

  Canvas.outlines = new THREE.Object3D();
  Canvas.outlines.name = "outline_group";
  scene.add(Canvas.outlines);

  canvas_scenes = {
    monitor: new PreviewBackground({ name: "display.reference.monitor" }),
    inventory_nine: new PreviewBackground({
      name: "display.reference.inventory_nine",
      image: "./assets/inventory_nine.png",
      x: 0,
      y: -525,
      size: 1051,
      lock: true,
    }),
    inventory_full: new PreviewBackground({
      name: "display.reference.inventory_full",
      image: "./assets/inventory_full.png",
      x: 0,
      y: -1740,
      size: 2781,
      lock: true,
    }),
    hud: new PreviewBackground({
      name: "display.reference.hud",
      image: "./assets/hud.png",
      x: -224,
      y: -447.5,
      size: 3391,
      lock: true,
    }),
  };
  if (localStorage.getItem("canvas_scenes")) {
    var stored_canvas_scenes = undefined;
    try {
      stored_canvas_scenes = JSON.parse(localStorage.getItem("canvas_scenes"));
    } catch (err) {}

    if (stored_canvas_scenes) {
      for (var key in canvas_scenes) {
        if (stored_canvas_scenes.hasOwnProperty(key)) {
          let store = stored_canvas_scenes[key];
          let real = canvas_scenes[key];

          if (store.image !== undefined) {
            real.image = store.image;
          }
          if (store.size !== undefined) {
            real.size = store.size;
          }
          if (store.x !== undefined) {
            real.x = store.x;
          }
          if (store.y !== undefined) {
            real.y = store.y;
          }
          if (store.lock !== undefined) {
            real.lock = store.lock;
          }
        }
      }
    }
  }

  MediaPreview = new Preview({ id: "media", offscreen: true });

  main_preview = new Preview({ id: "main" }).fullscreen();

  //TransformControls
  Transformer = new THREE.TransformControls(
    main_preview.camPers,
    main_preview.canvas
  );
  Transformer.setSize(0.5);
  scene.add(Transformer);
  main_preview.occupyTransformer();

  quad_previews = {
    get current() {
      return Preview.selected;
    },
    set current(p) {
      Preview.selected = p;
    },

    one: new Preview({ id: "one" }).setDefaultAnglePreset(
      DefaultCameraPresets[1]
    ),
    two: main_preview,
    three: new Preview({ id: "three" }).setDefaultAnglePreset(
      DefaultCameraPresets[3]
    ),
    four: new Preview({ id: "four" }).setDefaultAnglePreset(
      DefaultCameraPresets[5]
    ),
    get current() {
      return Preview.selected;
    },
  };

  Canvas.setup();
  CustomTheme.updateColors();
  resizeWindow();
}
function animate() {
  requestAnimationFrame(animate);
  if (
    !settings.background_rendering.value &&
    !document.hasFocus() &&
    !document.querySelector("#preview:hover")
  )
    return;
  TickUpdates.Run();

  if (Animator.open && Timeline.playing) {
    Timeline.loop();
  }
  if (quad_previews.current) {
    WinterskyScene.updateFacingRotation(quad_previews.current.camera);
  }
  Preview.all.forEach(function (prev) {
    if (prev.canvas.isConnected) {
      prev.render();
    }
  });
  framespersecond++;
  if (
    display_mode === true &&
    ground_animation === true &&
    !Transformer.hoverAxis
  ) {
    DisplayMode.groundAnimation();
  }
  Blockbench.dispatchEvent("render_frame");
}

function updateShading() {
  Canvas.updateLayeredTextures();
  scene.remove(lights);
  display_scene.remove(lights);
  Sun.intensity = settings.brightness.value / 50;
  if (settings.shading.value === true) {
    Sun.intensity *= 0.5;
    let parent = display_mode ? display_scene : scene;
    parent.add(lights);
    lights.position.copy(parent.position).multiplyScalar(-1);
  }
  Texture.all.forEach((tex) => {
    let material = tex.getMaterial();
    material.uniforms.SHADE.value = settings.shading.value;
    material.uniforms.BRIGHTNESS.value = settings.brightness.value / 50;
  });
  Canvas.emptyMaterials.forEach((material) => {
    material.uniforms.SHADE.value = settings.shading.value;
    material.uniforms.BRIGHTNESS.value = settings.brightness.value / 50;
  });
  Canvas.solidMaterial.uniforms.SHADE.value = settings.shading.value;
  Canvas.solidMaterial.uniforms.BRIGHTNESS.value =
    settings.brightness.value / 50;
  Canvas.normalHelperMaterial.uniforms.SHADE.value = settings.shading.value;
}
function updateCubeHighlights(hover_cube, force_off) {
  Outliner.elements.forEach((element) => {
    if (
      element.visibility &&
      element.mesh.geometry &&
      element.preview_controller.updateHighlight
    ) {
      element.preview_controller.updateHighlight(
        element,
        hover_cube,
        force_off
      );
    }
  });
}
//Helpers
function buildGrid() {
  three_grid.children.length = 0;
  if (Canvas.side_grids) {
    Canvas.side_grids.x.children.length = 0;
    Canvas.side_grids.z.children.length = 0;
  }
  if (Modes.display && settings.display_grid.value === false) return;

  three_grid.name = "grid_group";
  gizmo_colors.grid.set(
    parseInt("0x" + CustomTheme.data.colors.grid.replace("#", ""), 16)
  );
  var material;

  Canvas.northMarkMaterial.color = gizmo_colors.grid;

  function setupAxisLine(origin, length, axis) {
    var color = "rgb"[getAxisNumber(axis)];
    var material = new THREE.LineBasicMaterial({
      color: gizmo_colors[color],
    });
    var dest = new THREE.Vector3().copy(origin);
    dest[axis] += length;
    let points = [origin, dest];
    let geometry = new THREE.BufferGeometry().setFromPoints(points);

    //geometry.vertices.push(origin)
    //geometry.vertices.push(dest)

    var line = new THREE.Line(geometry, material);
    line.name = "axis_line_" + axis;
    three_grid.add(line);
  }
  //Axis Lines
  if (settings.base_grid.value) {
    var length = Format.centered_grid
      ? settings.full_grid.value
        ? 24
        : 8
      : 16;
    setupAxisLine(new THREE.Vector3(0, 0.01, 0), length, "x");
    setupAxisLine(new THREE.Vector3(0, 0.01, 0), length, "z");
  }

  var side_grid = new THREE.Object3D();

  if (settings.full_grid.value === true) {
    //Grid
    let size = settings.large_grid_size.value * 16;
    var grid = new THREE.GridHelper(
      size,
      size / canvasGridSize(),
      gizmo_colors.grid
    );
    if (Format.centered_grid) {
      grid.position.set(0, 0, 0);
    } else {
      grid.position.set(8, 0, 8);
    }
    grid.name = "grid";
    three_grid.add(grid);
    side_grid.add(grid.clone());

    //North
    geometry = new THREE.PlaneGeometry(5, 5);
    var north_mark = new THREE.Mesh(geometry, Canvas.northMarkMaterial);
    if (Format.centered_grid) {
      north_mark.position.set(0, 0, -3 - size / 2);
    } else {
      north_mark.position.set(8, 0, 5 - size / 2);
    }
    north_mark.rotation.x = Math.PI / -2;
    three_grid.add(north_mark);
  } else {
    if (settings.large_grid.value === true) {
      //Grid
      let size = settings.large_grid_size.value;
      var grid = new THREE.GridHelper(size * 16, size, gizmo_colors.grid);
      if (Format.centered_grid) {
        grid.position.set(0, 0, 0);
      } else {
        grid.position.set(8, 0, 8);
      }
      grid.name = "grid";
      three_grid.add(grid);
      side_grid.add(grid.clone());
    }

    if (settings.base_grid.value === true) {
      //Grid
      var grid = new THREE.GridHelper(
        16,
        16 / canvasGridSize(),
        gizmo_colors.grid
      );

      if (Format.centered_grid) {
        grid.position.set(0, 0, 0);
      } else {
        grid.position.set(8, 0, 8);
      }
      grid.name = "grid";
      three_grid.add(grid);
      side_grid.add(grid.clone());

      //North
      geometry = new THREE.PlaneGeometry(2.4, 2.4);
      var north_mark = new THREE.Mesh(geometry, Canvas.northMarkMaterial);
      if (Format.centered_grid) {
        north_mark.position.set(0, 0, -9.5);
      } else {
        north_mark.position.set(8, 0, -1.5);
      }
      north_mark.rotation.x = Math.PI / -2;
      three_grid.add(north_mark);
    }
  }
  if (settings.large_box.value === true) {
    var geometry_box = new THREE.EdgesGeometry(
      new THREE.BoxBufferGeometry(48, 48, 48)
    );

    var line_material = new THREE.LineBasicMaterial({
      color: gizmo_colors.grid,
    });
    var large_box = new THREE.LineSegments(geometry_box, line_material);
    if (Format.centered_grid) {
      large_box.position.set(0, 8, 0);
    } else {
      large_box.position.set(8, 8, 8);
    }
    large_box.name = "grid";
    three_grid.add(large_box);
  }
  scene.add(three_grid);

  Canvas.side_grids = {
    x: side_grid,
    z: side_grid.clone(),
  };
  three_grid.add(Canvas.side_grids.x);
  Canvas.side_grids.x.name = "side_grid_x";
  Canvas.side_grids.x.visible = !Modes.display;
  Canvas.side_grids.x.rotation.z = Math.PI / 2;
  Canvas.side_grids.x.position.y = Format.centered_grid ? 8 : 0;
  Canvas.side_grids.z.position.z = 0;
  Canvas.side_grids.x.children.forEach((el) => {
    el.layers.set(1);
  });

  three_grid.add(Canvas.side_grids.z);
  Canvas.side_grids.z.name = "side_grid_z";
  Canvas.side_grids.z.visible = !Modes.display;
  Canvas.side_grids.z.rotation.z = Math.PI / 2;
  Canvas.side_grids.z.rotation.y = Math.PI / 2;
  Canvas.side_grids.z.position.y = Format.centered_grid ? 8 : 0;
  Canvas.side_grids.z.position.z = 0;
  Canvas.side_grids.z.children.forEach((el) => {
    el.layers.set(3);
  });
}
