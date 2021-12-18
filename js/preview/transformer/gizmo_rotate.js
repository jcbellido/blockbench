THREE.TransformGizmoRotate = class extends THREE.TransformGizmo {
  constructor() {
    super();
    var CircleGeometry = function (radius, facing, arc) {
      var geometry = new THREE.BufferGeometry();
      var vertices = [];
      arc = arc ? arc : 1;

      for (var i = 0; i <= 64 * arc; ++i) {
        if (facing === "x")
          vertices.push(
            0,
            Math.cos((i / 32) * Math.PI) * radius,
            Math.sin((i / 32) * Math.PI) * radius
          );
        if (facing === "y")
          vertices.push(
            Math.cos((i / 32) * Math.PI) * radius,
            0,
            Math.sin((i / 32) * Math.PI) * radius
          );
        if (facing === "z")
          vertices.push(
            Math.sin((i / 32) * Math.PI) * radius,
            Math.cos((i / 32) * Math.PI) * radius,
            0
          );
      }

      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
      );
      return geometry;
    };

    this.handleGizmos = {
      X: [
        [
          new THREE.Line(
            new CircleGeometry(1, "x", 0.5),
            new GizmoLineMaterial({ color: gizmo_colors.r })
          ),
        ],
        [
          new THREE.Mesh(
            new THREE.OctahedronBufferGeometry(0.06, 0),
            new GizmoLineMaterial({ color: gizmo_colors.r })
          ),
          [0, 0, 0.98],
          null,
          [1, 4, 1],
        ],
      ],
      Y: [
        [
          new THREE.Line(
            new CircleGeometry(1, "y", 0.5),
            new GizmoLineMaterial({ color: gizmo_colors.g })
          ),
        ],
        [
          new THREE.Mesh(
            new THREE.OctahedronBufferGeometry(0.06, 0),
            new GizmoLineMaterial({ color: gizmo_colors.g })
          ),
          [0, 0, 0.98],
          null,
          [4, 1, 1],
        ],
      ],
      Z: [
        [
          new THREE.Line(
            new CircleGeometry(1, "z", 0.5),
            new GizmoLineMaterial({ color: gizmo_colors.b })
          ),
        ],
        [
          new THREE.Mesh(
            new THREE.OctahedronBufferGeometry(0.06, 0),
            new GizmoLineMaterial({ color: gizmo_colors.b })
          ),
          [0.98, 0, 0],
          null,
          [1, 4, 1],
        ],
      ],

      E: [
        [
          new THREE.Line(
            new CircleGeometry(1.2, "z", 1),
            new GizmoLineMaterial({ color: gizmo_colors.outline })
          ),
        ],
      ],
      XYZE: [
        [
          new THREE.Line(
            new CircleGeometry(1, "z", 1),
            new GizmoLineMaterial({ color: gizmo_colors.grid })
          ),
        ],
      ],
    };

    this.pickerGizmos = {
      X: [
        [
          new THREE.Mesh(
            new THREE.TorusBufferGeometry(1, 0.12, 4, 12, Math.PI),
            pickerMaterial
          ),
          [0, 0, 0],
          [0, -Math.PI / 2, -Math.PI / 2],
        ],
      ],
      Y: [
        [
          new THREE.Mesh(
            new THREE.TorusBufferGeometry(1, 0.12, 4, 12, Math.PI),
            pickerMaterial
          ),
          [0, 0, 0],
          [Math.PI / 2, 0, 0],
        ],
      ],
      Z: [
        [
          new THREE.Mesh(
            new THREE.TorusBufferGeometry(1, 0.12, 4, 12, Math.PI),
            pickerMaterial
          ),
          [0, 0, 0],
          [0, 0, -Math.PI / 2],
        ],
      ],
      E: [
        [
          new THREE.Mesh(
            new THREE.TorusBufferGeometry(1.2, 0.12, 2, 24),
            pickerMaterial
          ),
        ],
      ],
    };

    this.setActivePlane = function (axis) {
      if (axis === "E") this.activePlane = this.planes["XYZE"];

      if (axis === "X") this.activePlane = this.planes["YZ"];

      if (axis === "Y") this.activePlane = this.planes["XZ"];

      if (axis === "Z") this.activePlane = this.planes["XY"];
    };

    this.update = function (rotation, eye2) {
      THREE.TransformGizmo.prototype.update.apply(this, arguments);

      var tempMatrix = new THREE.Matrix4();
      var worldRotation = new THREE.Euler(0, 0, 1);
      var tempQuaternion = new THREE.Quaternion();
      var unitX = new THREE.Vector3(1, 0, 0);
      var unitY = new THREE.Vector3(0, 1, 0);
      var unitZ = new THREE.Vector3(0, 0, 1);
      var quaternionX = new THREE.Quaternion();
      var quaternionY = new THREE.Quaternion();
      var quaternionZ = new THREE.Quaternion();
      var eye = eye2.clone();

      worldRotation.copy(this.planes["XY"].rotation);
      tempQuaternion.setFromEuler(worldRotation);

      tempMatrix
        .makeRotationFromQuaternion(tempQuaternion)
        .copy(tempMatrix)
        .invert();
      eye.applyMatrix4(tempMatrix);

      this.traverse(function (child) {
        tempQuaternion.setFromEuler(worldRotation);

        if (child.name === "X") {
          quaternionX.setFromAxisAngle(unitX, Math.atan2(-eye.y, eye.z));
          tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionX);
          child.quaternion.copy(tempQuaternion);
        }

        if (child.name === "Y") {
          quaternionY.setFromAxisAngle(unitY, Math.atan2(eye.x, eye.z));
          tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionY);
          child.quaternion.copy(tempQuaternion);
        }

        if (child.name === "Z") {
          quaternionZ.setFromAxisAngle(unitZ, Math.atan2(eye.y, eye.x));
          tempQuaternion.multiplyQuaternions(tempQuaternion, quaternionZ);
          child.quaternion.copy(tempQuaternion);
        }
      });
    };

    this.init();
  }
};
