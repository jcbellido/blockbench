THREE.TransformGizmoScale = class extends THREE.TransformGizmo {
  constructor() {
    super();
    //var arrowGeometry = new THREE.Geometry();
    var arrowGeometry = new THREE.BoxGeometry(0.15, 0.06, 0.15);

    var lineXGeometry = new THREE.BufferGeometry();
    lineXGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3)
    );

    var lineYGeometry = new THREE.BufferGeometry();
    lineYGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 0, 0, 0, 1, 0], 3)
    );

    var lineZGeometry = new THREE.BufferGeometry();
    lineZGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 1], 3)
    );

    let planeGeo = new THREE.PlaneBufferGeometry(0.3, 0.3);
    let planePickerGeo = new THREE.PlaneBufferGeometry(0.4, 0.4);

    let plane_offset = 0.3;

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

        [
          new THREE.Mesh(
            arrowGeometry,
            new GizmoMaterial({ color: gizmo_colors.r })
          ),
          [-1, 0, 0],
          [0, 0, -Math.PI / 2],
        ],
        [
          new THREE.Line(
            lineXGeometry,
            new GizmoLineMaterial({ color: gizmo_colors.r })
          ),
          [-1, 0, 0],
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

        [
          new THREE.Mesh(
            arrowGeometry,
            new GizmoMaterial({ color: gizmo_colors.g })
          ),
          [0, -1, 0],
        ],
        [
          new THREE.Line(
            lineYGeometry,
            new GizmoLineMaterial({ color: gizmo_colors.g })
          ),
          [0, -1, 0],
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

        [
          new THREE.Mesh(
            arrowGeometry,
            new GizmoMaterial({ color: gizmo_colors.b })
          ),
          [0, 0, -1],
          [Math.PI / 2, 0, 0],
        ],
        [
          new THREE.Line(
            lineZGeometry,
            new GizmoLineMaterial({ color: gizmo_colors.b })
          ),
          [0, 0, -1],
        ],
      ],
      YZ: [
        [
          new THREE.Mesh(
            planeGeo,
            new GizmoMaterial({
              color: gizmo_colors.r,
              side: THREE.DoubleSide,
              opacity: 0.5,
            })
          ),
          [0, plane_offset, plane_offset],
          [0, Math.PI / 2, 0],
        ],
      ],
      XZ: [
        [
          new THREE.Mesh(
            planeGeo,
            new GizmoMaterial({
              color: gizmo_colors.g,
              side: THREE.DoubleSide,
              opacity: 0.5,
            })
          ),
          [plane_offset, 0, plane_offset],
          [-Math.PI / 2, 0, 0],
        ],
      ],
      XY: [
        [
          new THREE.Mesh(
            planeGeo,
            new GizmoMaterial({
              color: gizmo_colors.b,
              side: THREE.DoubleSide,
              opacity: 0.5,
            })
          ),
          [plane_offset, plane_offset, 0],
        ],
      ],
    };
    this.handleGizmos.X[2][0].name = "NX";
    this.handleGizmos.X[3][0].name = "NX";
    this.handleGizmos.Y[2][0].name = "NY";
    this.handleGizmos.Y[3][0].name = "NY";
    this.handleGizmos.Z[2][0].name = "NZ";
    this.handleGizmos.Z[3][0].name = "NZ";

    this.pickerGizmos = {
      X: [
        [
          new THREE.Mesh(
            new THREE.CylinderBufferGeometry(0.2, 0, 1, 4, 1, false),
            pickerMaterial
          ),
          [0.6, 0, 0],
          [0, 0, -Math.PI / 2],
        ],
        [
          new THREE.Mesh(
            new THREE.CylinderBufferGeometry(0.2, 0, 1, 4, 1, false),
            pickerMaterial
          ),
          [-0.6, 0, 0],
          [0, 0, Math.PI / 2],
        ],
      ],
      Y: [
        [
          new THREE.Mesh(
            new THREE.CylinderBufferGeometry(0.2, 0, 1, 4, 1, false),
            pickerMaterial
          ),
          [0, 0.6, 0],
        ],
        [
          new THREE.Mesh(
            new THREE.CylinderBufferGeometry(0.2, 0, 1, 4, 1, false),
            pickerMaterial
          ),
          [0, -0.6, 0],
          [Math.PI / 1, 0, 0],
        ],
      ],
      Z: [
        [
          new THREE.Mesh(
            new THREE.CylinderBufferGeometry(0.2, 0, 1, 4, 1, false),
            pickerMaterial
          ),
          [0, 0, 0.6],
          [Math.PI / 2, 0, 0],
        ],
        [
          new THREE.Mesh(
            new THREE.CylinderBufferGeometry(0.2, 0, 1, 4, 1, false),
            pickerMaterial
          ),
          [0, 0, -0.6],
          [-Math.PI / 2, 0, 0],
        ],
      ],
      XY: [
        [
          new THREE.Mesh(planePickerGeo, pickerMaterial),
          [plane_offset, plane_offset, 0],
        ],
      ],
      YZ: [
        [
          new THREE.Mesh(planePickerGeo, pickerMaterial),
          [0, plane_offset, plane_offset],
          [0, Math.PI / 2, 0],
        ],
      ],
      XZ: [
        [
          new THREE.Mesh(planePickerGeo, pickerMaterial),
          [plane_offset, 0, plane_offset],
          [-Math.PI / 2, 0, 0],
        ],
      ],
    };
    this.pickerGizmos.X[1][0].name = "NX";
    this.pickerGizmos.Y[1][0].name = "NY";
    this.pickerGizmos.Z[1][0].name = "NZ";

    this.setActivePlane = function (axis, eye) {
      var tempMatrix = new THREE.Matrix4();
      eye.applyMatrix4(
        tempMatrix
          .copy(tempMatrix.extractRotation(this.planes["XY"].matrixWorld))
          .invert()
      );

      if (axis === "X" || axis === "NX" || axis == "XZ") {
        this.activePlane = this.planes["XY"];
        if (Math.abs(eye.y) > Math.abs(eye.z))
          this.activePlane = this.planes["XZ"];
      }
      if (axis === "Y" || axis === "NY" || axis == "YZ") {
        this.activePlane = this.planes["XY"];
        if (Math.abs(eye.x) > Math.abs(eye.z))
          this.activePlane = this.planes["YZ"];
      }
      if (axis === "Z" || axis === "NZ" || axis == "YZ") {
        this.activePlane = this.planes["XZ"];
        if (Math.abs(eye.x) > Math.abs(eye.y))
          this.activePlane = this.planes["YZ"];
      }
    };
    this.init();
  }
};
