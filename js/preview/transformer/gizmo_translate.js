THREE.TransformGizmoTranslate = class extends THREE.TransformGizmo {
  constructor() {
    super();

    let arrowGeometry = new THREE.CylinderGeometry(0, 0.07, 0.2, 12, 1, false);

    let pickerCylinderGeo = new THREE.CylinderBufferGeometry(
      0.2,
      0,
      1,
      4,
      1,
      false
    );

    var lineXGeometry = new THREE.BufferGeometry();
    lineXGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3)
    );
    lineXGeometry.name = "gizmo_x";

    var lineYGeometry = new THREE.BufferGeometry();
    lineYGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 0, 0, 0, 1, 0], 3)
    );
    lineYGeometry.name = "gizmo_y";

    var lineZGeometry = new THREE.BufferGeometry();
    lineZGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 1], 3)
    );
    lineZGeometry.name = "gizmo_z";

    this.handleGizmos = {
      X: [
        [
          new THREE.Mesh(
            arrowGeometry,
            new GizmoMaterial({ color: gizmo_colors.r })
          ),
          [1, 0, 0],
          [0, 0, -Math.PI / 2],
        ],
        [
          new THREE.Line(
            lineXGeometry,
            new GizmoLineMaterial({ color: gizmo_colors.r })
          ),
        ],
      ],
      Y: [
        [
          new THREE.Mesh(
            arrowGeometry,
            new GizmoMaterial({ color: gizmo_colors.g })
          ),
          [0, 1, 0],
        ],
        [
          new THREE.Line(
            lineYGeometry,
            new GizmoLineMaterial({ color: gizmo_colors.g })
          ),
        ],
      ],
      Z: [
        [
          new THREE.Mesh(
            arrowGeometry,
            new GizmoMaterial({ color: gizmo_colors.b })
          ),
          [0, 0, 1],
          [Math.PI / 2, 0, 0],
        ],
        [
          new THREE.Line(
            lineZGeometry,
            new GizmoLineMaterial({ color: gizmo_colors.b })
          ),
        ],
      ],
    };

    this.pickerGizmos = {
      X: [
        [
          new THREE.Mesh(pickerCylinderGeo, pickerMaterial),
          [0.6, 0, 0],
          [0, 0, -Math.PI / 2],
        ],
      ],
      Y: [[new THREE.Mesh(pickerCylinderGeo, pickerMaterial), [0, 0.6, 0]]],
      Z: [
        [
          new THREE.Mesh(pickerCylinderGeo, pickerMaterial),
          [0, 0, 0.6],
          [Math.PI / 2, 0, 0],
        ],
      ],
    };
    this.init();
  }
  
  setActivePlane(axis, eye) {
    var tempMatrix = new THREE.Matrix4();
    eye.applyMatrix4(
      tempMatrix
        .copy(tempMatrix.extractRotation(this.planes["XY"].matrixWorld))
        .invert()
    );

    if (axis === "X") {
      this.activePlane = this.planes["XY"];
      if (Math.abs(eye.y) > Math.abs(eye.z))
        this.activePlane = this.planes["XZ"];
    }

    if (axis === "Y") {
      this.activePlane = this.planes["XY"];
      if (Math.abs(eye.x) > Math.abs(eye.z))
        this.activePlane = this.planes["YZ"];
    }

    if (axis === "Z") {
      this.activePlane = this.planes["XZ"];
      if (Math.abs(eye.x) > Math.abs(eye.y))
        this.activePlane = this.planes["YZ"];
    }
  }
}
