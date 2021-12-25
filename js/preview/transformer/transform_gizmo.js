THREE.TransformGizmo = class extends THREE.Object3D {
  constructor() {
    super();

    this.init = function () {
      this.handles = new THREE.Object3D();
      this.pickers = new THREE.Object3D();
      this.planes = new THREE.Object3D();

      this.add(this.handles);
      this.add(this.pickers);
      this.add(this.planes);

      //// PLANES
      this.planeGeometry = new THREE.PlaneBufferGeometry(50, 50, 2, 2);
      this.planeMaterial = new THREE.MeshBasicMaterial({
        visible: false,
        side: THREE.DoubleSide,
      });

      var planes = {
        XY: new THREE.Mesh(this.planeGeometry, this.planeMaterial),
        YZ: new THREE.Mesh(this.planeGeometry, this.planeMaterial),
        XZ: new THREE.Mesh(this.planeGeometry, this.planeMaterial),
        XYZE: new THREE.Mesh(this.planeGeometry, this.planeMaterial),
      };

      this.activePlane = planes["XYZE"];

      planes["YZ"].rotation.set(0, Math.PI / 2, 0);
      planes["XZ"].rotation.set(-Math.PI / 2, 0, 0);

      for (var i in planes) {
        planes[i].name = i;
        this.planes.add(planes[i]);
        this.planes[i] = planes[i];
      }

      //// HANDLES AND PICKERS
      this.setupGizmos(this.handleGizmos, this.handles);
      this.setupGizmos(this.pickerGizmos, this.pickers);

      // reset Transformations
      this.traverse(function (child) {
        if (child instanceof THREE.Mesh)
        {
          child.updateMatrix();

          let tempGeometry = child.geometry.clone();
          tempGeometry.applyMatrix4(child.matrix);
          child.geometry = tempGeometry;

          child.position.set(0, 0, 0);
          child.rotation.set(0, 0, 0);
          child.scale.set(1, 1, 1);
        }
      });
    }
  }
  
  setupGizmos(gizmoMap, parent) {
    for (var name in gizmoMap) {
      for (i = gizmoMap[name].length; i--; )
      {
        var object = gizmoMap[name][i][0];
        var position = gizmoMap[name][i][1];
        var rotation = gizmoMap[name][i][2];
        var scale = gizmoMap[name][i][3];

        if (object.name.length === 0) {
          object.name = name;
        }
        object.renderDepth = 999;

        if (position)
        {
          object.position.set(position[0], position[1], position[2]);
        }
        if (rotation) {
          object.rotation.set(rotation[0], rotation[1], rotation[2]);
        }
        if (scale) {
          object.scale.set(scale[0], scale[1], scale[2]);
        }
        parent.add(object);
      }
    }
  }

  highlight(axis) {
    var axis_letter =
      typeof axis === "string" && axis.substr(-1).toLowerCase();

    this.traverse(function (child) {
      if (child.material && child.material.highlight) {
        if (
          child.name === axis &&
          axis_letter &&
          (child.scale[axis_letter] < 5 || axis == "E")
        ) {
          child.material.highlight(true);
        } else {
          child.material.highlight(false);
        }
      }
    });
  }

  update (rotation, eye) {
    var vec1 = new THREE.Vector3(0, 0, 0);
    var vec2 = new THREE.Vector3(0, 1, 0);
    var lookAtMatrix = new THREE.Matrix4();
  
    this.traverse(function (child) {
      if (child.name.search("E") !== -1) {
        child.quaternion.setFromRotationMatrix(
          lookAtMatrix.lookAt(eye, vec1, vec2)
        );
      } else if (
        child.name.search("X") !== -1 ||
        child.name.search("Y") !== -1 ||
        child.name.search("Z") !== -1
      ) {
        child.quaternion.setFromEuler(rotation);
      }
    });
  }
}

