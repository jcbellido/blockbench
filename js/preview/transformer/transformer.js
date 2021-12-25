THREE.TransformControls = class extends THREE.Object3D {
  constructor(cam, domElement) {
    super();

    domElement = domElement !== undefined ? domElement : document;

    this.camera = cam;
    this.elements = [];
    this.visible = false;
    this.space = "world";
    this.size = 1;
    this.axis = null;
    this.hoverAxis = null;
    this.direction = true;
    this.last_valid_position = new THREE.Vector3();
    this.rotation_selection = new THREE.Euler();

    this.firstLocation = [0, 0, 0];

    this._mode = "translate";
    this._dragging = false;
    this._has_groups = false;
    this._gizmo = {
      translate: new THREE.TransformGizmoTranslate(),
      scale: new THREE.TransformGizmoScale(),
      rotate: new THREE.TransformGizmoRotate(),
    };

    for (var type in this._gizmo) {
      var gizmoObj = this._gizmo[type];

      gizmoObj.visible = type === this._mode;
      this.add(gizmoObj);
    }

    this.pivot_marker = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.08),
      new THREE.MeshBasicMaterial()
    );

    this.pivot_marker.material.depthTest = false;
    this.pivot_marker.material.depthWrite = false;
    this.pivot_marker.material.side = THREE.FrontSide;
    this.pivot_marker.material.transparent = true;
    this.pivot_marker.material.color = gizmo_colors.outline;
    this.children[0].add(this.pivot_marker);

    //Adjust GIzmos
    this.traverse((kid) => {
      kid.renderOrder = 999;
    });

    this.attach = function (object) {
      this.elements.safePush(object);
      this.visible = true;
    };


    this.children[2].children[0].children[6].renderOrder -= 9;
    this.children[2].scale.set(0.8, 0.8, 0.8);

    this.canvas = domElement;

    //Vars
    this.changeEvent = { type: "change" };
    this.mouseDownEvent = { type: "mouseDown" };
    this.mouseUpEvent = { type: "mouseUp", mode: this._mode };
    this.objectChangeEvent = { type: "objectChange" };

    this.ray = new THREE.Raycaster();
    this.pointerVector = new THREE.Vector2();

    this.point = new THREE.Vector3();
    this.originalPoint = new THREE.Vector3();
    this.offset = new THREE.Vector3();
    
    // this.scale = 1; // I'm stomping a property of THREE.Object3D
    this._scalar_scale = 1;
    
    this.eye = new THREE.Vector3();

    this.tempMatrix = new THREE.Matrix4();
    this.originalValue = null;
    this.previousValue = 0;

    this.worldPosition = new THREE.Vector3();
    this.worldRotation = new THREE.Euler();
    this.camPosition = new THREE.Vector3();

    this.setCanvas(domElement);
    this.simulateMouseDown = function (e) {
      this._onPointerDown(e);
    };

    this.display_gui_rotation = new THREE.Object3D();
    this.display_gui_rotation.rotation.set(0.2, 0.2, 0);
    this.display_gui_rotation.updateMatrixWorld();

    this._onPointerDown = onPointerDown.bind( this );
    this._onPointerHover = onPointerHover.bind( this );
    this._onPointerMove = onPointerMove.bind( this );
    this._onPointerUp = onPointerUp.bind( this );

    this.dispatchPointerHover = this._onPointerHover;
  }

  intersectObjects(pointer, objects) {
    var rect = this.canvas.getBoundingClientRect();
    var x = (pointer.clientX - rect.left) / rect.width;
    var y = (pointer.clientY - rect.top) / rect.height;

    this.pointerVector.set(x * 2 - 1, -(y * 2) + 1);
    this.ray.setFromCamera(this.pointerVector, this.camera);

    var intersections = this.ray.intersectObjects(objects, true);
    return intersections[0] ? intersections[0] : false;
  }

  // Seems as this method is never properly called (??)
  // Need to dig deeper
  setCanvas(canvas) {
    if (this.canvas) {
      this.canvas.removeEventListener("mousedown", this._onPointerDown);
      this.canvas.removeEventListener("touchstart", this._onPointerDown);

      this.canvas.removeEventListener("mousemove", this._onPointerHover);
      this.canvas.removeEventListener("touchmove", this._onPointerHover);
    }

    this.canvas = canvas;
    this.canvas.addEventListener("mousedown",  this._onPointerDown, false);
    this.canvas.addEventListener("touchstart", this._onPointerDown, { passive: true, });

    this.canvas.addEventListener("mousemove", this._onPointerHover, false);
    this.canvas.addEventListener("touchmove", this._onPointerHover, { passive: true, });
  }

  attach(object) {
    console.log(object);
    this.elements.safePush(object);
    this.visible = true;
  }

  detach() {
    this.elements.length = 0;
    this.visible = false;
    this.axis = null;
    this.hoverAxis = null;
  }


  setMode(mode) {
    if (mode === "hidden") {
      return;
    }

    this._mode = mode || this._mode;
    if (this._mode === "scale") {
       this.space = "local";
    }

    for (var type in this._gizmo) {
      this._gizmo[type].visible = type === this._mode;
    }

    if (mode == "translate") {
      this.pivot_marker.visible = Toolbox.selected.visible =
        Toolbox.selected.id == "pivot_tool";
    }

    this.update();
    this.dispatchEvent(this.changeEvent);
  }

  setSize(size) {
    this.size = size;
    this.update();
    this.dispatchEvent(this.changeEvent);
  };

  setSpace(space) {
    this.space = space;
    this.update();
    this.dispatchEvent(this.changeEvent);
  };

  getScale() {
    this.camera.updateMatrixWorld();
    this.camPosition.setFromMatrixPosition(this.camera.matrixWorld);

    return (
      this.camera.preview.calculateControlScale(this.worldPosition) *
      settings.control_size.value *
      0.74
    );
  };

  setScale(sc) {
    this.scale.set(sc, sc, sc);
  }
  
  update(object) {
    if (!object) {
      object = this.rotation_ref;
    }
    if (this.elements.length == 0) {
      this.detach();
    }
    this.getWorldPosition(this.worldPosition);
    this.setScale(this.getScale());

    this._gizmo.rotate.children[0].children[6].visible = !(
      Format &&
      Format.rotation_limit &&
      Modes.edit
    );

    // Origin
    let scale =
      this.camera.preview.calculateControlScale(
        rot_origin.getWorldPosition(new THREE.Vector3())
      ) *
      settings.origin_size.value *
      0.2;
    rot_origin.scale.set(scale, scale, scale);
    if (rot_origin.base_scale) {
      rot_origin.scale.multiply(rot_origin.base_scale);
    }

    // Update Eye Position
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.eye.copy(this.camPosition).sub(this.worldPosition).normalize();
    } else if (this.camera instanceof THREE.OrthographicCamera) {
      this.eye.copy(this.camPosition).normalize();
    }

    if (this.elements.length == 0) {
      return;
    }

    if (object) {
      if (!this._dragging)
        this.worldRotation.setFromRotationMatrix(
          this.tempMatrix.extractRotation(object.matrixWorld)
        );
      
      if (Toolbox.selected.transformerMode === "rotate") {
        this._gizmo[this._mode].update(this.worldRotation, this.eye);
        this.rotation.set(0, 0, 0);
      } else {
        object.getWorldQuaternion(this.rotation);
      }

      if (
        this.rotation_selection.x ||
        this.rotation_selection.y ||
        this.rotation_selection.z
      ) {
        let q = Reusable.quat1.setFromEuler(this.rotation_selection);
        this.quaternion.multiply(q);
        this.worldRotation.setFromQuaternion(this.quaternion);
      }
    }
    else 
    {
      this.worldRotation.set(0, 0, 0);
      this.rotation.set(0, 0, 0);
      this._gizmo[this._mode].update(this.worldRotation, this.eye);
    }

    this._gizmo[this._mode].highlight(this.axis);
  }

  fadeInControls(frames) {
    if (!frames || typeof frames !== "number") {
      frames = 10;
    }

    this.scale = this.getScale();
    var old_scale = this.scale.x;
    var diff = (this.scale - old_scale) / frames;

    var i = 0;
    var interval = setInterval(function () {
      i++;
      this.setScale(old_scale + i * diff);
      if (i >= frames) {
        clearInterval(interval);
      }
    }, 16);
  }

  updateSelection() {
    this.elements.empty();
    if (Modes.edit || Modes.pose || Toolbox.selected.id == "pivot_tool") {
      if (Outliner.selected.length) {
        Outliner.selected.forEach((element) => {
          if (
            (element.movable &&
              Toolbox.selected.transformerMode == "translate") ||
            (element.resizable &&
              Toolbox.selected.transformerMode == "scale") ||
            (element.rotatable &&
              Toolbox.selected.transformerMode == "rotate")
          ) {
            this.attach(element);
          }
        });
      } else if (Group.selected && getRotationObject() == Group.selected) {
        this.attach(Group.selected);
      } else {
        return this;
      }
    }
    this.center();
    this.update();
    return this;
  }


  getTransformSpace() {
    var rotation_tool =
      Toolbox.selected.id === "rotate_tool" ||
      Toolbox.selected.id === "pivot_tool";
    if (
      !selected.length &&
      (!Group.selected || !rotation_tool || !Format.bone_rig)
    )
      return;

    let input_space =
      Toolbox.selected == BarItems.rotate_tool
        ? BarItems.rotation_space.get()
        : BarItems.transform_space.get();

    if (Toolbox.selected == BarItems.rotate_tool && Format.rotation_limit)
      return 2;

    if (
      input_space == "local" &&
      selected.length &&
      selected[0].rotatable &&
      (!Format.bone_rig || !Group.selected) &&
      Toolbox.selected.id !== "pivot_tool"
    ) {
      let is_local = true;
      if (Format.bone_rig) {
        for (var el of selected) {
          if (el.parent !== selected[0].parent) {
            is_local = false;
            break;
          }
        }
      }
      if (is_local) {
        for (var el of selected) {
          if (
            el.rotation !== selected[0].rotation &&
            !(
              el.rotation instanceof Array &&
              el.rotation.equals(selected[0].rotation)
            )
          ) {
            is_local = false;
            break;
          }
        }
      }
      if (is_local) return 2;
    }
    if (
      input_space === "local" &&
      Format.bone_rig &&
      Group.selected &&
      Toolbox.selected == BarItems.rotate_tool
    ) {
      // Local Space
      return 2;
    }
    if (input_space === "normal" && Mesh.selected.length) {
      // Local Space
      return 3;
    }
    if (input_space !== "global" && Format.bone_rig) {
      // Bone Space
      if (
        Format.bone_rig &&
        Group.selected &&
        Group.selected.matchesSelection()
      ) {
        if (Group.selected.parent instanceof Group) {
          return Group.selected.parent;
        } else {
          return 0;
        }
      }
      let bone = 0;
      if (Outliner.selected.length) {
        bone = Outliner.selected[0].parent;
      } else if (Group.selected && Group.selected.parent instanceof Group) {
        bone = Group.selected.parent;
      }
      for (var el of Outliner.selected) {
        if (el.parent !== bone) {
          bone = 0;
          break;
        }
      }
      return bone;
    }
    // Global Space
    return 0;
  }

  center() {
    delete this.rotation_ref;
    this.rotation_selection.set(0, 0, 0);
    if (Modes.edit || Modes.pose || Toolbox.selected.id == "pivot_tool") {
      if (this.visible) {
        var rotation_tool =
          Toolbox.selected.id === "rotate_tool" ||
          Toolbox.selected.id === "pivot_tool";
        var rotation_object = getRotationObject();
        if (
          rotation_object instanceof Array ||
          (!rotation_object && !rotation_tool)
        ) {
          var arr =
            rotation_object instanceof Array ? rotation_object : selected;
          rotation_object = undefined;
          for (var obj of arr) {
            if (obj.visibility) {
              rotation_object = obj;
              break;
            }
          }
        }
        if (!rotation_object) {
          this.detach();
          return;
        }
        this.rotation_object = rotation_object;

        //Center
        if (
          Toolbox.selected.id === "rotate_tool" ||
          Toolbox.selected.id === "pivot_tool"
        ) {
          if (
            rotation_object instanceof Mesh &&
            Project.selected_vertices[rotation_object.uuid] &&
            Project.selected_vertices[rotation_object.uuid].length > 0
          ) {
            this.position.copy(rotation_object.getWorldCenter());
          } else if (rotation_object.mesh) {
            rotation_object.mesh.getWorldPosition(this.position);
          } else {
            this.position.copy(rotation_object.getWorldCenter());
          }
          this.position.sub(scene.position);
        } else {
          var center = getSelectionCenter();
          this.position.fromArray(center);
        }

        let space = this.getTransformSpace();
        //Rotation
        if (space >= 2 || Toolbox.selected.id == "resize_tool") {
          this.rotation_ref = Group.selected
            ? Group.selected.mesh
            : selected[0] && selected[0].mesh;
          if (Toolbox.selected.id == "rotate_tool" && Group.selected) {
            this.rotation_ref = Group.selected.mesh;
          }
          if (space === 3 && Mesh.selected[0]) {
            let rotation = Mesh.selected[0].getSelectionRotation();
            if (rotation) this.rotation_selection.copy(rotation);
          }
        } else if (space instanceof Group) {
          this.rotation_ref = space.mesh;
        }
      }
    } else if (Modes.display) {
      display_scene.add(Transformer);
      this.attach(display_base);

      display_base.getWorldPosition(this.position);

      if (Toolbox.selected.transformerMode === "translate") {
        this.rotation_ref = display_area;
      } else if (Toolbox.selected.transformerMode === "scale") {
        this.rotation_ref = display_base;
      } else if (
        Toolbox.selected.transformerMode === "rotate" &&
        display_slot == "gui"
      ) {
        this.rotation_ref = this.display_gui_rotation;
      }
      this.update();
    } else if (Modes.animate && Group.selected) {
      this.attach(Group.selected);
      Group.selected.mesh.getWorldPosition(this.position);

      if (
        Toolbox.selected.id === "rotate_tool" &&
        BarItems.rotation_space.value === "global"
      ) {
        delete this.rotation_ref;
      } else if (
        Toolbox.selected.id === "move_tool" &&
        BarItems.transform_space.value === "global"
      ) {
        delete this.rotation_ref;
      } else if (
        Toolbox.selected.id == "resize_tool" ||
        (Toolbox.selected.id === "rotate_tool" &&
          BarItems.rotation_space.value !== "global")
      ) {
        this.rotation_ref = Group.selected.mesh;
      } else {
        this.rotation_ref = Group.selected.mesh.parent;
      }
    } else if (Modes.animate && NullObject.selected[0]) {
      this.attach(NullObject.selected[0]);
      this.position.copy(NullObject.selected[0].getWorldCenter(true));

      if (BarItems.rotation_space.value === "global") {
        delete this.rotation_ref;
      } else {
        this.rotation_ref = NullObject.selected[0].mesh.parent;
      }
    }
  }

  displayDistance(number) {
    Blockbench.setStatusBarText(trimFloatNumber(number));
  }
  
  beforeFirstChange(event, point) {
    if (this.hasChanged) {
      return;
    }

    if (Modes.edit || Modes.pose || Toolbox.selected.id == "pivot_tool") {
      if (Toolbox.selected.id === "resize_tool") {
        var axisnr = getAxisNumber(this.axis.toLowerCase().replace("n", ""));
        selected.forEach(function (obj) {
          if (obj instanceof Mesh) {
            obj.oldVertices = {};
            for (let key in obj.vertices) {
              obj.oldVertices[key] = obj.vertices[key].slice();
            }
          } else if (obj.resizable) {
            obj.oldScale = obj.size(axisnr);
            obj.oldCenter = obj.from.map((from, i) => (from + obj.to[i]) / 2);
          }
        });
      }
      this._has_groups =
        Format.bone_rig &&
        Group.selected &&
        Group.selected.matchesSelection() &&
        Toolbox.selected.transformerMode == "translate";
      var rotate_group =
        Format.bone_rig &&
        Group.selected &&
        Toolbox.selected.transformerMode == "rotate";

      if (rotate_group) {
        Undo.initEdit({ group: Group.selected });
      } else if (this._has_groups) {
        Undo.initEdit({
          elements: selected,
          outliner: true,
          selection: true,
        });
      } else {
        Undo.initEdit({ elements: selected });
      }
    } else if (Modes.id === "animate") {
      if (Timeline.playing) {
        Timeline.pause();
      }
      this.keyframes = [];
      var animator = Animation.selected.getBoneAnimator();
      if (animator) {
        var { before, result } = animator.getOrMakeKeyframe(
          Toolbox.selected.animation_channel
        );

        Undo.initEdit({ keyframes: before ? [before] : [] });
        result.select();
        this.keyframes.push(result);
      }
    } else if (Modes.id === "display") {
      Undo.initEdit({ display_slots: [display_slot] });
    }
    this.firstChangeMade = true;
  }

  extendTransformLine(long) {
    let axis = this.axis.substr(-1).toLowerCase();
    let axisNumber = getAxisNumber(axis);
    let main_gizmo = this._gizmo[this._mode].children[0];

    switch (Toolbox.selected.transformerMode) {
      default:
        var line = main_gizmo.children[axisNumber * 2];
        break;
      case "scale":
        var line =
          main_gizmo.children[
            (axisNumber * 2 + (this.direction ? 1 : 0)) * 2
          ];
        break;
      case "rotate":
        var line = rot_origin;
        break;
    }
    line.scale[axis] = long ? 20000 : 1;
    if (Toolbox.selected.transformerMode !== "rotate") {
      line.position[axis] = long
        ? -10000
        : this.direction || Toolbox.selected.transformerMode !== "scale"
        ? 0
        : -1;
    } else {
      line.base_scale[axis] = long ? 20000 : 1;
    }
    this._gizmo[this._mode].highlight(this.axis);
  }

  cancelMovement(event, keep_changes = false) {
    onPointerUp(event, keep_changes);
    Undo.cancelEdit();
  }
}; // end class definition


/// Global event Handlers

function onPointerHover(event) {
  if (
    this.elements.length === 0 ||
    (event.button !== undefined && event.button !== 0)
  )
    return;

  var pointer = event.changedTouches ? event.changedTouches[0] : event;
  var intersect = this.intersectObjects(pointer, this._gizmo[this._mode].pickers.children);

  if (this._dragging === true) {
      return;
  }
  
  this.hoverAxis = null;

  if (intersect) {
    this.hoverAxis = intersect.object.name;
    event.preventDefault();
  }

  if (this.axis !== this.hoverAxis) {
    this.axis = this.hoverAxis;
    this.update();
    this.dispatchEvent(this.changeEvent);
  }
}

function onPointerDown(event) {
  document.addEventListener("mouseup", this._onPointerUp, false);

  if (
    this.elements.length === 0 ||
    this._dragging === true ||
    (event.button !== undefined && event.button !== 0)
  ) {
    return;
  }
    
  var pointer = event.changedTouches ? event.changedTouches[0] : event;
  if (pointer.button === 0 || pointer.button === undefined) {
    var intersect = this.intersectObjects(
      pointer,
      this._gizmo[this._mode].pickers.children
    );

    if (intersect)
    {
      this._dragging = true;
      document.addEventListener("touchend",     this._onPointerUp, { passive: true, });
      document.addEventListener("touchcancel",  this._onPointerUp, { passive: true, });
      document.addEventListener("touchleave",   this._onPointerUp, { passive: true, });
      document.addEventListener("mousemove",    this._onPointerMove, true);
      document.addEventListener("touchmove",    this._onPointerMove, { passive: true, });

      this.getWorldPosition(this.worldPosition);
      //if (this.camera.axis && (this.hoverAxis && this.hoverAxis.toLowerCase() === this.camera.axis) === (_mode !== 'rotate')) return;
      event.preventDefault();
      event.stopPropagation();
      this.dispatchEvent(this.mouseDownEvent);

      this.axis = intersect.object.name;
      this.update();
      this.eye.copy( this.camPosition ).sub( this.worldPosition ).normalize();
      this._gizmo[this._mode].setActivePlane( this.axis, this.eye );
      var planeIntersect = this.intersectObjects(pointer, [
        this._gizmo[this._mode].activePlane,
      ]);

      this.last_valid_position.copy(this.position);
      this.hasChanged = false;

      if (Toolbox.selected.id === "resize_tool") {
        this.direction = this.axis.substr(0, 1) !== "N";
      }

      if (planeIntersect) {
        this.offset.copy(planeIntersect.point);
        this.previousValue = undefined;
        Canvas.outlineObjects(selected);
        this.extendTransformLine(true);
      }
      this._dragging = true;
    }
  }
}

function onPointerUp(event, keep_changes = true) {
  document.removeEventListener("mouseup", this._onPointerUp);
  // this._dragging = false; // --> commented out by meself ... also ... DAFUK ???

  document.removeEventListener("mousemove", this._onPointerMove);
  document.removeEventListener("touchmove", this._onPointerMove);
  document.removeEventListener("touchend", this._onPointerUp);
  document.removeEventListener("touchcancel", this._onPointerUp);
  document.removeEventListener("touchleave", this._onPointerUp);

  if (
    event.button !== undefined &&
    event.button !== 0 &&
    event.button !== 2
  )
  {
    return;
  }

  if (this._dragging && this.axis !== null)
  {
    this.mouseUpEvent.mode = this._mode;
    this.dispatchEvent(this.mouseUpEvent);
    this.orbit_controls.stopMovement();
    Canvas.outlines.children.length = 0;
    this.originalValue = null;

    this.extendTransformLine(false);

    Blockbench.setStatusBarText();

    if (
      Modes.id === "edit" ||
      Modes.id === "pose" ||
      Toolbox.selected.id == "pivot_tool"
    ) {
      if (Toolbox.selected.id === "resize_tool") {
        //Scale
        selected.forEach(function (obj) {
          delete obj.oldScale;
          delete obj.oldCenter;
        });
        if (this.hasChanged && keep_changes) {
          Undo.finishEdit("Resize");
        }
      } else if (this.axis !== null && this.hasChanged && keep_changes) {
        if (Toolbox.selected.id == "pivot_tool") {
          Undo.finishEdit("Move pivot");
        } else if (Toolbox.selected.id == "rotate_tool") {
          Undo.finishEdit("Rotate selection");
        } else {
          Undo.finishEdit("Move selection");
        }
      }
      updateSelection();
    } else if (
      Modes.id === "animate" &&
      this.keyframes &&
      this.keyframes.length &&
      keep_changes
    ) {
      Undo.finishEdit("Change keyframe", { keyframes: this.keyframes });
    } else if (Modes.id === "display" && keep_changes) {
      Undo.finishEdit("Edit display slot");
    }
  }
  this._dragging = false;

  if (
    this.hasChanged &&
    Blockbench.startup_count <= 1 &&
    !Blockbench.hasFlag("size_modifier_message")
  ) {
    Blockbench.addFlag("size_modifier_message");
    setTimeout(() => {
      Blockbench.showToastNotification({
        text: "message.size_modifiers",
        expire: 10000,
      });
    }, 5000);
  }

  if ("TouchEvent" in window && event instanceof TouchEvent) {
    // Force "rollover"
    this.axis = null;
    this.update();
    this.dispatchEvent(this.changeEvent);
  } else {
    this._onPointerHover(event);
  }
}

function onPointerMove(event) {
  if (
    this.elements.length == 0 ||
    this.axis === null ||
    this._dragging === false ||
    (event.button !== undefined && event.button !== 0)
  )
  {
    return;
  }

  this.orbit_controls.hasMoved = true;
  var pointer = event.changedTouches ? event.changedTouches[0] : event;
  var planeIntersect = this.intersectObjects(pointer, [
    this._gizmo[this._mode].activePlane,
  ]);
  if (!planeIntersect) {
    return;
  }

  event.stopPropagation();

  var axis = (
    this.direction == false && this.axis.length == 2
      ? this.axis[1]
      : this.axis[0]
  ).toLowerCase();
  var axisNumber = getAxisNumber(axis);
  var rotate_normal;
  var axisB, axisNumberB;

  if (this.axis.length == 2 && this.axis[0] !== "N") {
    axisB = this.axis[1].toLowerCase();
    axisNumberB = getAxisNumber(axisB);
  }

  this.point.copy(planeIntersect.point);

  if (Toolbox.selected.transformerMode !== "rotate") {
    this.point.sub(this.offset);
    if (!display_mode) {
      this.point.removeEuler(this.worldRotation);
    }
  } else {
    this.point.sub(this.worldPosition);
    this.point.removeEuler(this.worldRotation);

    if (this.axis == "E") {
      let matrix = new THREE.Matrix4()
        .copy(this._gizmo[this._mode].activePlane.matrix)
        .invert();
      this.point.applyMatrix4(matrix);
      var angle = Math.radToDeg(Math.atan2(this.point.y, this.point.x));
      rotate_normal = Preview.selected.camera
        .getWorldDirection(new THREE.Vector3())
        .multiplyScalar(-1);
    } else {
      var rotations = [
        Math.atan2(this.point.z, this.point.y),
        Math.atan2(this.point.x, this.point.z),
        Math.atan2(this.point.y, this.point.x),
      ];
      var angle = Math.radToDeg(rotations[axisNumber]);
    }
  }
  let transform_space = this.getTransformSpace();

  if (Modes.edit || Modes.pose || Toolbox.selected.id == "pivot_tool") 
  {
    if (Toolbox.selected.id === "move_tool") 
    {
      var snap_factor = canvasGridSize(
        event.shiftKey || Pressing.overrides.shift,
        event.ctrlOrCmd || Pressing.overrides.ctrl
      );
      this.point[axis] = Math.round(this.point[axis] / snap_factor) * snap_factor;

      if (this.originalValue === null) {
        this.originalValue = this.point[axis];
      }
      if (this.previousValue === undefined) 
      {
        this.previousValue = this.point[axis];
      } 
      else if (this.previousValue !== this.point[axis])
      {
        this.beforeFirstChange(event);

        var difference = this.point[axis] - this.previousValue;

        var overlapping = false;
        if (Format.canvas_limit && !settings.deactivate_size_limit.value) {
          selected.forEach(function (obj) {
            if (obj.movable && obj.resizable) {
              overlapping =
                overlapping ||
                obj.to[axisNumber] + difference + obj.inflate > 32 ||
                obj.to[axisNumber] + difference + obj.inflate < -16 ||
                obj.from[axisNumber] + difference - obj.inflate > 32 ||
                obj.from[axisNumber] + difference - obj.inflate < -16;
            }
          });
        }
        if (!overlapping) 
        {
          this.displayDistance(this.point[axis] - this.originalValue);

          moveElementsInSpace(difference, axisNumber);

          updateSelection();
        }
        this.previousValue = this.point[axis];
        this.hasChanged = true;
      }
    } else if (Toolbox.selected.id === "resize_tool") 
    {
      // Resize
      if (axisB) {
        if (axis == "y") {
          axis = "z";
        } else if (axisB == "y") {
          axis = "y";
        } else if (axisB == "z") {
          axis = "x";
        }
      }
      var snap_factor = canvasGridSize(
        event.shiftKey || Pressing.overrides.shift,
        event.ctrlOrCmd || Pressing.overrides.ctrl
      );
      this.point[axis] = Math.round(this.point[axis] / snap_factor) * snap_factor;

      if (this.previousValue !== this.point[axis])
      {
        this.beforeFirstChange(event);

        selected.forEach(function (obj, i) 
          {
            if (obj.resizable) {
              let bidirectional =
                ((event.altKey || Pressing.overrides.alt) &&
                  BarItems.swap_tools.keybind.key != 18) !==
                selected[0] instanceof Mesh;

              if (axisB) {
                bidirectional = true;
              }

              if (! axisB) {
                obj.resize(
                  this.point[axis],
                  axisNumber,
                  !this.direction,
                  null,
                  bidirectional
                );
              } else {
                let value = this.point[axis];
                obj.resize(value, axisNumber, false, null, bidirectional);
                obj.resize(value, axisNumberB, false, null, bidirectional);
              }
            }
          }.bind(this)
        );
        this.displayDistance(this.point[axis] * (this.direction ? 1 : -1));
        this.updateSelection();
        this.previousValue = this.point[axis];
        this.hasChanged = true;
      }
    } else if (Toolbox.selected.id === "rotate_tool")
    {
      var snap = getRotationInterval(event);
      angle = Math.round(angle / snap) * snap;
      if (Math.abs(angle) > 300) angle = angle > 0 ? -snap : snap;
      if (this.previousValue === undefined) {
        this.previousValue = angle;
      }
      if (this.originalValue === null) {
        this.originalValue = angle;
      }

      if (this.previousValue !== angle) {
        this.beforeFirstChange(event);

        var difference = angle - this.previousValue;
        if (axisNumber == undefined) {
          axisNumber = rotate_normal;
        }
        rotateOnAxis((n) => n + difference, axisNumber);
        Canvas.updatePositions(true);
        this.updateSelection();
        this.displayDistance(angle - this.originalValue);
        this.previousValue = angle;
        this.hasChanged = true;
      }
    } else if (Toolbox.selected.id === "pivot_tool") {
      var snap_factor = canvasGridSize(
        event.shiftKey || Pressing.overrides.shift,
        event.ctrlOrCmd || Pressing.overrides.ctrl
      );
      this.point[axis] = Math.round(this.point[axis] / snap_factor) * snap_factor;

      if (this.originalValue === null) {
        this.originalValue = this.point[axis];
      }
      if (this.previousValue === undefined)
      {
        this.previousValue = this.point[axis];
      }
      else if (this.previousValue !== this.point[axis])
      {
        this.beforeFirstChange(event);

        var difference = this.point[axis] - this.previousValue;
        var origin = this.rotation_object.origin.slice();

        if (transform_space == 0)
        {
          let vec = new THREE.Vector3();
          var rotation = new THREE.Quaternion();
          vec[axis] = difference;
          this.rotation_object.mesh.parent.getWorldQuaternion(
            rotation
          );
          vec.applyQuaternion(rotation.invert());
          origin.V3_add(vec.x, vec.y, vec.z);
        } else {
          origin[axisNumber] += difference;
        }

        if (Format.bone_rig && Group.selected) {
          Group.selected.transferOrigin(origin, true);
        } else {
          selected.forEach((obj) => {
            if (obj.transferOrigin) {
              obj.transferOrigin(origin);
            }
          });
        }
        this.displayDistance(this.point[axis] - this.originalValue);
        Canvas.updatePositions(true);
        Canvas.updateAllBones();
        if (Modes.animate) {
          Animator.preview();
        }
        this.updateSelection();

        this.previousValue = this.point[axis];
        this.hasChanged = true;
      }
    }
  } else if (Modes.animate) {
    if (!Animation.selected) {
      Blockbench.showQuickMessage("message.no_animation_selected");
    }
    if (Toolbox.selected.id === "rotate_tool") {
      value = Math.trimDeg(axisNumber === 2 ? angle : -angle);
      var round_num = getRotationInterval(event);
    } else {
      value = this.point[axis];
      var round_num = canvasGridSize(
        event.shiftKey || Pressing.overrides.shift,
        event.ctrlOrCmd || Pressing.overrides.ctrl
      );
      if (Toolbox.selected.id === "resize_tool") {
        value *= this.direction ? 0.1 : -0.1;
        round_num *= 0.1;
      }
    }
    value = Math.round(value / round_num) * round_num;
    if (this.previousValue === undefined) {
      this.previousValue = value;
    }

    if (this.originalValue === null) {
      this.originalValue = value;
    }

    if (
      value !== this.previousValue &&
      Animation.selected &&
      Animation.selected.getBoneAnimator()
    ) {
      this.beforeFirstChange(event, planeIntersect.point);

      var difference = value - (this.previousValue || 0);
      if (
        Toolbox.selected.id === "rotate_tool" &&
        Math.abs(difference) > 120
      ) {
        difference = 0;
      }

      let { mesh } = Group.selected || NullObject.selected[0];

      if (
        Toolbox.selected.id === "rotate_tool" &&
        (BarItems.rotation_space.value === "global" || this.axis == "E")
      ) {
        let normal =
          this.axis == "E"
            ? rotate_normal
            : axisNumber == 0
            ? THREE.NormalX
            : axisNumber == 1
            ? THREE.NormalY
            : THREE.NormalZ;
        if (axisNumber != 2) difference *= -1;
        let rotWorldMatrix = new THREE.Matrix4();
        rotWorldMatrix.makeRotationAxis(normal, Math.degToRad(difference));
        rotWorldMatrix.multiply(mesh.matrixWorld);

        let inverse = new THREE.Matrix4()
          .copy(mesh.parent.matrixWorld)
          .invert();
        rotWorldMatrix.premultiply(inverse);

        mesh.matrix.copy(rotWorldMatrix);
        mesh.setRotationFromMatrix(rotWorldMatrix);
        let e = mesh.rotation;

        this.keyframes[0].offset(
          "x",
          Math.trimDeg(
            -Math.radToDeg(e.x - mesh.fix_rotation.x) -
              this.keyframes[0].calc("x")
          )
        );
        this.keyframes[0].offset(
          "y",
          Math.trimDeg(
            -Math.radToDeg(e.y - mesh.fix_rotation.y) -
              this.keyframes[0].calc("y")
          )
        );
        this.keyframes[0].offset(
          "z",
          Math.trimDeg(
            Math.radToDeg(e.z - mesh.fix_rotation.z) -
              this.keyframes[0].calc("z")
          )
        );
      } else if (
        Toolbox.selected.id === "rotate_tool" &&
        this.getTransformSpace() == 2
      ) {
        if (axisNumber != 2) difference *= -1;

        let old_order = mesh.rotation.order;
        mesh.rotation.reorder(
          axisNumber == 0 ? "ZYX" : axisNumber == 1 ? "ZXY" : "XYZ"
        );
        var obj_val = Math.trimDeg(
          Math.radToDeg(mesh.rotation[axis]) + difference
        );
        mesh.rotation[axis] = Math.degToRad(obj_val);
        mesh.rotation.reorder(old_order);

        this.keyframes[0].offset(
          "x",
          Math.trimDeg(
            -Math.radToDeg(mesh.rotation.x - mesh.fix_rotation.x) -
              this.keyframes[0].calc("x")
          )
        );
        this.keyframes[0].offset(
          "y",
          Math.trimDeg(
            -Math.radToDeg(mesh.rotation.y - mesh.fix_rotation.y) -
              this.keyframes[0].calc("y")
          )
        );
        this.keyframes[0].offset(
          "z",
          Math.trimDeg(
            Math.radToDeg(mesh.rotation.z - mesh.fix_rotation.z) -
              this.keyframes[0].calc("z")
          )
        );
      } else if (
        Toolbox.selected.id === "move_tool" &&
        BarItems.transform_space.value === "global"
      ) {
        let offset_vec = new THREE.Vector3();
        offset_vec[axis] = difference;

        var rotation = new THREE.Quaternion();
        mesh.parent.getWorldQuaternion(rotation);
        offset_vec.applyQuaternion(rotation.invert());

        this.keyframes[0].offset("x", -offset_vec.x);
        this.keyframes[0].offset("y", offset_vec.y);
        this.keyframes[0].offset("z", offset_vec.z);
      } else {
        if (axis == "x" && Toolbox.selected.id === "move_tool") {
          difference *= -1;
        }
        this.keyframes[0].offset(axis, difference);
      }
      this.keyframes[0].select();

      this.displayDistance(value - this.originalValue);

      Animator.preview();
      this.previousValue = value;
      this.hasChanged = true;
    }
  } else if (Modes.display) {
    var rotation = new THREE.Quaternion();
    this.getWorldQuaternion(rotation);
    this.point.applyQuaternion(rotation.invert());

    var channel = Toolbox.selected.animation_channel;
    if (channel === "position") {
      channel = "translation";
    }
    var value = this.point[axis];
    var bf =
      Project.display_settings[display_slot][channel][axisNumber] -
        (this.previousValue || 0) || 0;

    if (channel === "rotation") {
      value = Math.trimDeg(bf + Math.round(angle * 4) / 4) - bf;
    } else if (channel === "translation") {
      value = limitNumber(bf + Math.round(value * 4) / 4, -80, 80) - bf;
    } /* scale */ else {
      value =
        limitNumber(
          bf +
            (Math.round(value * 64) / (64 * 8)) *
              (this.direction ? 1 : -1),
          0,
          4
        ) - bf;
    }

    if (display_slot.includes("lefthand")) {
      if (channel === "rotation" && axisNumber) {
        value *= -1;
      } else if (channel === "translation" && !axisNumber) {
        value *= -1;
      }
    }

    if (this.previousValue === undefined) {
      this.previousValue = value;
    }

    if (this.originalValue === null) {
      this.originalValue = value;
    }

    if (value !== this.previousValue) {
      this.beforeFirstChange(event);

      var difference = value - (this.previousValue || 0);

      if (channel === "rotation") {
        let normal = Reusable.vec1.copy(
          this.axis == "E"
            ? rotate_normal
            : axisNumber == 0
            ? THREE.NormalX
            : axisNumber == 1
            ? THREE.NormalY
            : THREE.NormalZ
        );

        let quaternion = display_base
          .getWorldQuaternion(new THREE.Quaternion())
          .invert();
        normal.applyQuaternion(quaternion);
        display_base.rotateOnAxis(normal, Math.degToRad(difference));

        Project.display_settings[display_slot][channel][0] = Math.roundTo(
          Math.radToDeg(display_base.rotation.x),
          2
        );
        Project.display_settings[display_slot][channel][1] = Math.roundTo(
          Math.radToDeg(display_base.rotation.y) *
            (display_slot.includes("lefthand") ? -1 : 1),
          2
        );
        Project.display_settings[display_slot][channel][2] = Math.roundTo(
          Math.radToDeg(display_base.rotation.z) *
            (display_slot.includes("lefthand") ? -1 : 1),
          2
        );
      } else {
        Project.display_settings[display_slot][channel][axisNumber] +=
          difference;
      }

      if (
        (event.shiftKey || Pressing.overrides.shift) &&
        channel === "scale"
      ) {
        var val =
          Project.display_settings[display_slot][channel][axisNumber];
        Project.display_settings[display_slot][channel][
          (axisNumber + 1) % 3
        ] = val;
        Project.display_settings[display_slot][channel][
          (axisNumber + 2) % 3
        ] = val;
      }
      DisplayMode.slot.update();

      this.displayDistance(value - this.originalValue);

      this.previousValue = value;
      this.hasChanged = true;
    }
  }

  this.dispatchEvent(this.changeEvent);
  this.dispatchEvent(this.objectChangeEvent);
}
