/**
 * original author: arodic / https://github.com/arodic
 * modified for Blockbench by jannisx11
 */

(function () {
  // "use strict"; // < where probably I absolute should try to use ... `use`, `include` or whatever javascript uses for it's bloody imports

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

      var scope = this;

      var _mode = "translate";
      var _dragging = false;
      var _has_groups = false;
      var _gizmo = {
        translate: new THREE.TransformGizmoTranslate(),
        scale: new THREE.TransformGizmoScale(),
        rotate: new THREE.TransformGizmoRotate(),
      };

      for (var type in _gizmo) {
        var gizmoObj = _gizmo[type];

        gizmoObj.visible = type === _mode;
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
      this.children[2].children[0].children[6].renderOrder -= 9;
      this.children[2].scale.set(0.8, 0.8, 0.8);

      //Vars
      var changeEvent = { type: "change" };
      var mouseDownEvent = { type: "mouseDown" };
      var mouseUpEvent = { type: "mouseUp", mode: _mode };
      var objectChangeEvent = { type: "objectChange" };

      var ray = new THREE.Raycaster();
      var pointerVector = new THREE.Vector2();

      var point = new THREE.Vector3();
      var originalPoint = new THREE.Vector3();
      var offset = new THREE.Vector3();
      var scale = 1;
      var eye = new THREE.Vector3();

      var tempMatrix = new THREE.Matrix4();
      var originalValue = null;
      var previousValue = 0;

      var worldPosition = new THREE.Vector3();
      var worldRotation = new THREE.Euler();
      var camPosition = new THREE.Vector3();

      this.attach = function (object) {
        this.elements.safePush(object);
        this.visible = true;
      };

      this.detach = function () {
        this.elements.length = 0;
        this.visible = false;
        this.axis = null;
        this.hoverAxis = null;
      };
      this.setMode = function (mode) {
        if (mode === "hidden") {
          return;
        }
        _mode = mode || _mode;
        if (_mode === "scale") scope.space = "local";
        for (var type in _gizmo) _gizmo[type].visible = type === _mode;
        if (mode == "translate") {
          this.pivot_marker.visible = Toolbox.selected.visible =
            Toolbox.selected.id == "pivot_tool";
        }

        this.update();
        scope.dispatchEvent(changeEvent);
      };
      this.setSize = function (size) {
        scope.size = size;
        this.update();
        scope.dispatchEvent(changeEvent);
      };
      this.setSpace = function (space) {
        scope.space = space;
        this.update();
        scope.dispatchEvent(changeEvent);
      };
      this.getScale = function () {
        Transformer.camera.updateMatrixWorld();
        camPosition.setFromMatrixPosition(Transformer.camera.matrixWorld);

        return (
          Transformer.camera.preview.calculateControlScale(worldPosition) *
          settings.control_size.value *
          0.74
        );
      };
      this.setScale = function (sc) {
        Transformer.scale.set(sc, sc, sc);
      };
      this.update = function (object) {
        var scope = Transformer;

        if (!object) {
          object = this.rotation_ref;
        }
        if (scope.elements.length == 0) {
          this.detach();
        }
        this.getWorldPosition(worldPosition);
        this.setScale(this.getScale());

        _gizmo.rotate.children[0].children[6].visible = !(
          Format &&
          Format.rotation_limit &&
          Modes.edit
        );

        // Origin
        let scale =
          scope.camera.preview.calculateControlScale(
            rot_origin.getWorldPosition(new THREE.Vector3())
          ) *
          settings.origin_size.value *
          0.2;
        rot_origin.scale.set(scale, scale, scale);
        if (rot_origin.base_scale) {
          rot_origin.scale.multiply(rot_origin.base_scale);
        }

        // Update Eye Position
        if (scope.camera instanceof THREE.PerspectiveCamera) {
          eye.copy(camPosition).sub(worldPosition).normalize();
        } else if (scope.camera instanceof THREE.OrthographicCamera) {
          eye.copy(camPosition).normalize();
        }

        if (scope.elements.length == 0) return;

        if (object) {
          if (!this.dragging)
            worldRotation.setFromRotationMatrix(
              tempMatrix.extractRotation(object.matrixWorld)
            );
          if (Toolbox.selected.transformerMode === "rotate") {
            _gizmo[_mode].update(worldRotation, eye);
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
            worldRotation.setFromQuaternion(this.quaternion);
          }
        } else {
          worldRotation.set(0, 0, 0);
          this.rotation.set(0, 0, 0);
          _gizmo[_mode].update(worldRotation, eye);
        }
        _gizmo[_mode].highlight(scope.axis);
      };
      this.fadeInControls = function (frames) {
        if (!frames || typeof frames !== "number") frames = 10;
        var scope = Transformer;
        scale = this.getScale();
        var old_scale = Transformer.scale.x;
        var diff = (scale - old_scale) / frames;

        var i = 0;
        var interval = setInterval(function () {
          i++;
          Transformer.setScale(old_scale + i * diff);
          if (i >= frames) {
            clearInterval(interval);
          }
        }, 16);
      };
      this.setCanvas = function (canvas) {
        if (this.canvas) {
          this.canvas.removeEventListener("mousedown", onPointerDown);
          this.canvas.removeEventListener("touchstart", onPointerDown);

          this.canvas.removeEventListener("mousemove", onPointerHover);
          this.canvas.removeEventListener("touchmove", onPointerHover);
        }
        this.canvas = canvas;
        this.canvas.addEventListener("mousedown", onPointerDown, false);
        this.canvas.addEventListener("touchstart", onPointerDown, {
          passive: true,
        });

        this.canvas.addEventListener("mousemove", onPointerHover, false);
        this.canvas.addEventListener("touchmove", onPointerHover, {
          passive: true,
        });
      };
      this.setCanvas(domElement);
      this.simulateMouseDown = function (e) {
        onPointerDown(e);
      };

      this.updateSelection = function () {
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
                scope.attach(element);
              }
            });
          } else if (Group.selected && getRotationObject() == Group.selected) {
            scope.attach(Group.selected);
          } else {
            return this;
          }
        }
        this.center();
        this.update();
        return this;
      };
      var display_gui_rotation = new THREE.Object3D();
      display_gui_rotation.rotation.set(0.2, 0.2, 0);
      display_gui_rotation.updateMatrixWorld();

      this.getTransformSpace = function () {
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
      };

      this.center = function () {
        delete Transformer.rotation_ref;
        Transformer.rotation_selection.set(0, 0, 0);
        if (Modes.edit || Modes.pose || Toolbox.selected.id == "pivot_tool") {
          if (Transformer.visible) {
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
              Transformer.position.sub(scene.position);
            } else {
              var center = getSelectionCenter();
              Transformer.position.fromArray(center);
            }

            let space = Transformer.getTransformSpace();
            //Rotation
            if (space >= 2 || Toolbox.selected.id == "resize_tool") {
              Transformer.rotation_ref = Group.selected
                ? Group.selected.mesh
                : selected[0] && selected[0].mesh;
              if (Toolbox.selected.id == "rotate_tool" && Group.selected) {
                Transformer.rotation_ref = Group.selected.mesh;
              }
              if (space === 3 && Mesh.selected[0]) {
                let rotation = Mesh.selected[0].getSelectionRotation();
                if (rotation) Transformer.rotation_selection.copy(rotation);
              }
            } else if (space instanceof Group) {
              Transformer.rotation_ref = space.mesh;
            }
          }
        } else if (Modes.display) {
          display_scene.add(Transformer);
          Transformer.attach(display_base);

          display_base.getWorldPosition(Transformer.position);

          if (Toolbox.selected.transformerMode === "translate") {
            Transformer.rotation_ref = display_area;
          } else if (Toolbox.selected.transformerMode === "scale") {
            Transformer.rotation_ref = display_base;
          } else if (
            Toolbox.selected.transformerMode === "rotate" &&
            display_slot == "gui"
          ) {
            Transformer.rotation_ref = display_gui_rotation;
          }
          Transformer.update();
        } else if (Modes.animate && Group.selected) {
          this.attach(Group.selected);
          Group.selected.mesh.getWorldPosition(this.position);

          if (
            Toolbox.selected.id === "rotate_tool" &&
            BarItems.rotation_space.value === "global"
          ) {
            delete Transformer.rotation_ref;
          } else if (
            Toolbox.selected.id === "move_tool" &&
            BarItems.transform_space.value === "global"
          ) {
            delete Transformer.rotation_ref;
          } else if (
            Toolbox.selected.id == "resize_tool" ||
            (Toolbox.selected.id === "rotate_tool" &&
              BarItems.rotation_space.value !== "global")
          ) {
            Transformer.rotation_ref = Group.selected.mesh;
          } else {
            Transformer.rotation_ref = Group.selected.mesh.parent;
          }
        } else if (Modes.animate && NullObject.selected[0]) {
          this.attach(NullObject.selected[0]);
          this.position.copy(NullObject.selected[0].getWorldCenter(true));

          if (BarItems.rotation_space.value === "global") {
            delete Transformer.rotation_ref;
          } else {
            Transformer.rotation_ref = NullObject.selected[0].mesh.parent;
          }
        }
      };
      this.cancelMovement = function (event, keep_changes = false) {
        onPointerUp(event, keep_changes);
        Undo.cancelEdit();
      };
      function displayDistance(number) {
        Blockbench.setStatusBarText(trimFloatNumber(number));
      }
      function extendTransformLine(long) {
        let axis = scope.axis.substr(-1).toLowerCase();
        let axisNumber = getAxisNumber(axis);
        let main_gizmo = _gizmo[_mode].children[0];

        switch (Toolbox.selected.transformerMode) {
          default:
            var line = main_gizmo.children[axisNumber * 2];
            break;
          case "scale":
            var line =
              main_gizmo.children[
                (axisNumber * 2 + (scope.direction ? 1 : 0)) * 2
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
            : scope.direction || Toolbox.selected.transformerMode !== "scale"
            ? 0
            : -1;
        } else {
          line.base_scale[axis] = long ? 20000 : 1;
        }
        _gizmo[_mode].highlight(scope.axis);
      }

      function onPointerHover(event) {
        if (
          scope.elements.length === 0 ||
          (event.button !== undefined && event.button !== 0)
        )
          return;

        var pointer = event.changedTouches ? event.changedTouches[0] : event;
        var intersect = intersectObjects(
          pointer,
          _gizmo[_mode].pickers.children
        );

        if (_dragging === true) return;
        scope.hoverAxis = null;

        if (intersect) {
          scope.hoverAxis = intersect.object.name;
          event.preventDefault();
        }
        if (scope.axis !== scope.hoverAxis) {
          scope.axis = scope.hoverAxis;
          scope.update();
          scope.dispatchEvent(changeEvent);
        }
      }
      function onPointerDown(event) {
        document.addEventListener("mouseup", onPointerUp, false);

        if (
          scope.elements.length === 0 ||
          _dragging === true ||
          (event.button !== undefined && event.button !== 0)
        )
          return;
        var pointer = event.changedTouches ? event.changedTouches[0] : event;
        if (pointer.button === 0 || pointer.button === undefined) {
          var intersect = intersectObjects(
            pointer,
            _gizmo[_mode].pickers.children
          );
          if (intersect) {
            scope.dragging = true;
            document.addEventListener("touchend", onPointerUp, {
              passive: true,
            });
            document.addEventListener("touchcancel", onPointerUp, {
              passive: true,
            });
            document.addEventListener("touchleave", onPointerUp, {
              passive: true,
            });

            document.addEventListener("mousemove", onPointerMove, false);
            document.addEventListener("touchmove", onPointerMove, {
              passive: true,
            });

            Transformer.getWorldPosition(worldPosition);
            //if (scope.camera.axis && (scope.hoverAxis && scope.hoverAxis.toLowerCase() === scope.camera.axis) === (_mode !== 'rotate')) return;
            event.preventDefault();
            event.stopPropagation();
            scope.dispatchEvent(mouseDownEvent);

            scope.axis = intersect.object.name;
            scope.update();
            eye.copy(camPosition).sub(worldPosition).normalize();
            _gizmo[_mode].setActivePlane(scope.axis, eye);
            var planeIntersect = intersectObjects(pointer, [
              _gizmo[_mode].activePlane,
            ]);

            scope.last_valid_position.copy(scope.position);
            scope.hasChanged = false;

            if (Toolbox.selected.id === "resize_tool") {
              scope.direction = scope.axis.substr(0, 1) !== "N";
            }

            if (planeIntersect) {
              offset.copy(planeIntersect.point);
              previousValue = undefined;
              Canvas.outlineObjects(selected);
              extendTransformLine(true);
            }
            _dragging = true;
          }
        }
      }
      function beforeFirstChange(event, point) {
        if (scope.hasChanged) return;

        if (Modes.edit || Modes.pose || Toolbox.selected.id == "pivot_tool") {
          if (Toolbox.selected.id === "resize_tool") {
            var axisnr = getAxisNumber(
              scope.axis.toLowerCase().replace("n", "")
            );
            selected.forEach(function (obj) {
              if (obj instanceof Mesh) {
                obj.oldVertices = {};
                for (let key in obj.vertices) {
                  obj.oldVertices[key] = obj.vertices[key].slice();
                }
              } else if (obj.resizable) {
                obj.oldScale = obj.size(axisnr);
                obj.oldCenter = obj.from.map(
                  (from, i) => (from + obj.to[i]) / 2
                );
              }
            });
          }
          _has_groups =
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
          } else if (_has_groups) {
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
          scope.keyframes = [];
          var animator = Animation.selected.getBoneAnimator();
          if (animator) {
            var { before, result } = animator.getOrMakeKeyframe(
              Toolbox.selected.animation_channel
            );

            Undo.initEdit({ keyframes: before ? [before] : [] });
            result.select();
            scope.keyframes.push(result);
          }
        } else if (Modes.id === "display") {
          Undo.initEdit({ display_slots: [display_slot] });
        }
        scope.firstChangeMade = true;
      }
      function onPointerMove(event) {
        if (
          scope.elements.length == 0 ||
          scope.axis === null ||
          _dragging === false ||
          (event.button !== undefined && event.button !== 0)
        )
          return;

        scope.orbit_controls.hasMoved = true;
        var pointer = event.changedTouches ? event.changedTouches[0] : event;
        var planeIntersect = intersectObjects(pointer, [
          _gizmo[_mode].activePlane,
        ]);
        if (!planeIntersect) return;

        event.stopPropagation();

        var axis = (
          scope.direction == false && scope.axis.length == 2
            ? scope.axis[1]
            : scope.axis[0]
        ).toLowerCase();
        var axisNumber = getAxisNumber(axis);
        var rotate_normal;
        var axisB, axisNumberB;

        if (scope.axis.length == 2 && scope.axis[0] !== "N") {
          axisB = scope.axis[1].toLowerCase();
          axisNumberB = getAxisNumber(axisB);
        }

        point.copy(planeIntersect.point);

        if (Toolbox.selected.transformerMode !== "rotate") {
          point.sub(offset);
          if (!display_mode) {
            point.removeEuler(worldRotation);
          }
        } else {
          point.sub(worldPosition);
          point.removeEuler(worldRotation);

          if (scope.axis == "E") {
            let matrix = new THREE.Matrix4()
              .copy(_gizmo[_mode].activePlane.matrix)
              .invert();
            point.applyMatrix4(matrix);
            var angle = Math.radToDeg(Math.atan2(point.y, point.x));
            rotate_normal = Preview.selected.camera
              .getWorldDirection(new THREE.Vector3())
              .multiplyScalar(-1);
          } else {
            var rotations = [
              Math.atan2(point.z, point.y),
              Math.atan2(point.x, point.z),
              Math.atan2(point.y, point.x),
            ];
            var angle = Math.radToDeg(rotations[axisNumber]);
          }
        }
        let transform_space = Transformer.getTransformSpace();

        if (Modes.edit || Modes.pose || Toolbox.selected.id == "pivot_tool") {
          if (Toolbox.selected.id === "move_tool") {
            var snap_factor = canvasGridSize(
              event.shiftKey || Pressing.overrides.shift,
              event.ctrlOrCmd || Pressing.overrides.ctrl
            );
            point[axis] = Math.round(point[axis] / snap_factor) * snap_factor;

            if (originalValue === null) {
              originalValue = point[axis];
            }
            if (previousValue === undefined) {
              previousValue = point[axis];
            } else if (previousValue !== point[axis]) {
              beforeFirstChange(event);

              var difference = point[axis] - previousValue;

              var overlapping = false;
              if (
                Format.canvas_limit &&
                !settings.deactivate_size_limit.value
              ) {
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
              if (!overlapping) {
                displayDistance(point[axis] - originalValue);

                moveElementsInSpace(difference, axisNumber);

                updateSelection();
              }
              previousValue = point[axis];
              scope.hasChanged = true;
            }
          } else if (Toolbox.selected.id === "resize_tool") {
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
            point[axis] = Math.round(point[axis] / snap_factor) * snap_factor;

            if (previousValue !== point[axis]) {
              beforeFirstChange(event);

              selected.forEach(function (obj, i) {
                if (obj.resizable) {
                  let bidirectional =
                    ((event.altKey || Pressing.overrides.alt) &&
                      BarItems.swap_tools.keybind.key != 18) !==
                    selected[0] instanceof Mesh;
                  if (axisB) bidirectional = true;

                  if (!axisB) {
                    obj.resize(
                      point[axis],
                      axisNumber,
                      !scope.direction,
                      null,
                      bidirectional
                    );
                  } else {
                    let value = point[axis];
                    obj.resize(value, axisNumber, false, null, bidirectional);
                    obj.resize(value, axisNumberB, false, null, bidirectional);
                  }
                }
              });
              displayDistance(point[axis] * (scope.direction ? 1 : -1));
              scope.updateSelection();
              previousValue = point[axis];
              scope.hasChanged = true;
            }
          } else if (Toolbox.selected.id === "rotate_tool") {
            var snap = getRotationInterval(event);
            angle = Math.round(angle / snap) * snap;
            if (Math.abs(angle) > 300) angle = angle > 0 ? -snap : snap;
            if (previousValue === undefined) previousValue = angle;
            if (originalValue === null) {
              originalValue = angle;
            }
            if (previousValue !== angle) {
              beforeFirstChange(event);

              var difference = angle - previousValue;
              if (axisNumber == undefined) {
                axisNumber = rotate_normal;
              }
              rotateOnAxis((n) => n + difference, axisNumber);
              Canvas.updatePositions(true);
              scope.updateSelection();
              displayDistance(angle - originalValue);
              previousValue = angle;
              scope.hasChanged = true;
            }
          } else if (Toolbox.selected.id === "pivot_tool") {
            var snap_factor = canvasGridSize(
              event.shiftKey || Pressing.overrides.shift,
              event.ctrlOrCmd || Pressing.overrides.ctrl
            );
            point[axis] = Math.round(point[axis] / snap_factor) * snap_factor;

            if (originalValue === null) {
              originalValue = point[axis];
            }
            if (previousValue === undefined) {
              previousValue = point[axis];
            } else if (previousValue !== point[axis]) {
              beforeFirstChange(event);

              var difference = point[axis] - previousValue;
              var origin = Transformer.rotation_object.origin.slice();

              if (transform_space == 0) {
                let vec = new THREE.Vector3();
                var rotation = new THREE.Quaternion();
                vec[axis] = difference;
                Transformer.rotation_object.mesh.parent.getWorldQuaternion(
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
              displayDistance(point[axis] - originalValue);
              Canvas.updatePositions(true);
              Canvas.updateAllBones();
              if (Modes.animate) {
                Animator.preview();
              }
              scope.updateSelection();

              previousValue = point[axis];
              scope.hasChanged = true;
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
            value = point[axis];
            var round_num = canvasGridSize(
              event.shiftKey || Pressing.overrides.shift,
              event.ctrlOrCmd || Pressing.overrides.ctrl
            );
            if (Toolbox.selected.id === "resize_tool") {
              value *= scope.direction ? 0.1 : -0.1;
              round_num *= 0.1;
            }
          }
          value = Math.round(value / round_num) * round_num;
          if (previousValue === undefined) previousValue = value;
          if (originalValue === null) {
            originalValue = value;
          }

          if (
            value !== previousValue &&
            Animation.selected &&
            Animation.selected.getBoneAnimator()
          ) {
            beforeFirstChange(event, planeIntersect.point);

            var difference = value - (previousValue || 0);
            if (
              Toolbox.selected.id === "rotate_tool" &&
              Math.abs(difference) > 120
            ) {
              difference = 0;
            }

            let { mesh } = Group.selected || NullObject.selected[0];

            if (
              Toolbox.selected.id === "rotate_tool" &&
              (BarItems.rotation_space.value === "global" || scope.axis == "E")
            ) {
              let normal =
                scope.axis == "E"
                  ? rotate_normal
                  : axisNumber == 0
                  ? THREE.NormalX
                  : axisNumber == 1
                  ? THREE.NormalY
                  : THREE.NormalZ;
              if (axisNumber != 2) difference *= -1;
              let rotWorldMatrix = new THREE.Matrix4();
              rotWorldMatrix.makeRotationAxis(
                normal,
                Math.degToRad(difference)
              );
              rotWorldMatrix.multiply(mesh.matrixWorld);

              let inverse = new THREE.Matrix4()
                .copy(mesh.parent.matrixWorld)
                .invert();
              rotWorldMatrix.premultiply(inverse);

              mesh.matrix.copy(rotWorldMatrix);
              mesh.setRotationFromMatrix(rotWorldMatrix);
              let e = mesh.rotation;

              scope.keyframes[0].offset(
                "x",
                Math.trimDeg(
                  -Math.radToDeg(e.x - mesh.fix_rotation.x) -
                    scope.keyframes[0].calc("x")
                )
              );
              scope.keyframes[0].offset(
                "y",
                Math.trimDeg(
                  -Math.radToDeg(e.y - mesh.fix_rotation.y) -
                    scope.keyframes[0].calc("y")
                )
              );
              scope.keyframes[0].offset(
                "z",
                Math.trimDeg(
                  Math.radToDeg(e.z - mesh.fix_rotation.z) -
                    scope.keyframes[0].calc("z")
                )
              );
            } else if (
              Toolbox.selected.id === "rotate_tool" &&
              Transformer.getTransformSpace() == 2
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

              scope.keyframes[0].offset(
                "x",
                Math.trimDeg(
                  -Math.radToDeg(mesh.rotation.x - mesh.fix_rotation.x) -
                    scope.keyframes[0].calc("x")
                )
              );
              scope.keyframes[0].offset(
                "y",
                Math.trimDeg(
                  -Math.radToDeg(mesh.rotation.y - mesh.fix_rotation.y) -
                    scope.keyframes[0].calc("y")
                )
              );
              scope.keyframes[0].offset(
                "z",
                Math.trimDeg(
                  Math.radToDeg(mesh.rotation.z - mesh.fix_rotation.z) -
                    scope.keyframes[0].calc("z")
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

              scope.keyframes[0].offset("x", -offset_vec.x);
              scope.keyframes[0].offset("y", offset_vec.y);
              scope.keyframes[0].offset("z", offset_vec.z);
            } else {
              if (axis == "x" && Toolbox.selected.id === "move_tool") {
                difference *= -1;
              }
              scope.keyframes[0].offset(axis, difference);
            }
            scope.keyframes[0].select();

            displayDistance(value - originalValue);

            Animator.preview();
            previousValue = value;
            scope.hasChanged = true;
          }
        } else if (Modes.display) {
          var rotation = new THREE.Quaternion();
          scope.getWorldQuaternion(rotation);
          point.applyQuaternion(rotation.invert());

          var channel = Toolbox.selected.animation_channel;
          if (channel === "position") channel = "translation";
          var value = point[axis];
          var bf =
            Project.display_settings[display_slot][channel][axisNumber] -
              (previousValue || 0) || 0;

          if (channel === "rotation") {
            value = Math.trimDeg(bf + Math.round(angle * 4) / 4) - bf;
          } else if (channel === "translation") {
            value = limitNumber(bf + Math.round(value * 4) / 4, -80, 80) - bf;
          } /* scale */ else {
            value =
              limitNumber(
                bf +
                  (Math.round(value * 64) / (64 * 8)) *
                    (scope.direction ? 1 : -1),
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
          if (previousValue === undefined) previousValue = value;
          if (originalValue === null) {
            originalValue = value;
          }

          if (value !== previousValue) {
            beforeFirstChange(event);

            var difference = value - (previousValue || 0);

            if (channel === "rotation") {
              let normal = Reusable.vec1.copy(
                scope.axis == "E"
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

            displayDistance(value - originalValue);

            previousValue = value;
            scope.hasChanged = true;
          }
        }

        scope.dispatchEvent(changeEvent);
        scope.dispatchEvent(objectChangeEvent);
      }
      function onPointerUp(event, keep_changes = true) {
        //event.preventDefault(); // Prevent MouseEvent on mobile
        document.removeEventListener("mouseup", onPointerUp);
        scope.dragging = false;

        document.removeEventListener("mousemove", onPointerMove);
        document.removeEventListener("touchmove", onPointerMove);
        document.removeEventListener("touchend", onPointerUp);
        document.removeEventListener("touchcancel", onPointerUp);
        document.removeEventListener("touchleave", onPointerUp);

        if (
          event.button !== undefined &&
          event.button !== 0 &&
          event.button !== 2
        )
          return;

        if (_dragging && scope.axis !== null) {
          mouseUpEvent.mode = _mode;
          scope.dispatchEvent(mouseUpEvent);
          scope.orbit_controls.stopMovement();
          Canvas.outlines.children.length = 0;
          originalValue = null;

          extendTransformLine(false);

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
              if (scope.hasChanged && keep_changes) {
                Undo.finishEdit("Resize");
              }
            } else if (
              scope.axis !== null &&
              scope.hasChanged &&
              keep_changes
            ) {
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
            scope.keyframes &&
            scope.keyframes.length &&
            keep_changes
          ) {
            Undo.finishEdit("Change keyframe", { keyframes: scope.keyframes });
          } else if (Modes.id === "display" && keep_changes) {
            Undo.finishEdit("Edit display slot");
          }
        }
        _dragging = false;

        if (
          scope.hasChanged &&
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
          scope.axis = null;
          scope.update();
          scope.dispatchEvent(changeEvent);
        } else {
          onPointerHover(event);
        }
      }
      function intersectObjects(pointer, objects) {
        var rect = scope.canvas.getBoundingClientRect();
        var x = (pointer.clientX - rect.left) / rect.width;
        var y = (pointer.clientY - rect.top) / rect.height;

        pointerVector.set(x * 2 - 1, -(y * 2) + 1);
        ray.setFromCamera(pointerVector, scope.camera);

        var intersections = ray.intersectObjects(objects, true);
        return intersections[0] ? intersections[0] : false;
      }
      this.dispatchPointerHover = onPointerHover;
    }
  };
})();
