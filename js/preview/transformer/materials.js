class GizmoMaterial extends THREE.MeshBasicMaterial {
  constructor(parameters) {
    super();

    this.depthTest = false;
    this.depthWrite = false;
    this.side = THREE.FrontSide;
    this.transparent = true;

    this.setValues(parameters);

    this.oldColor = this.color.clone();
    this.oldOpacity = this.opacity;

    this.highlight = function (highlighted) {
      if (highlighted) {
        this.color.copy(gizmo_colors.outline);
        this.color.r *= 1.2;
        this.color.g *= 1.2;
        this.color.b *= 1.2;
        this.opacity = 1;
      } else {
        this.color.copy(this.oldColor);
        this.opacity = this.oldOpacity;
      }
    };
  }
}

class GizmoLineMaterial extends THREE.LineBasicMaterial {
  constructor(parameters) {
    super();

    this.depthTest = false;
    this.depthWrite = false;
    this.transparent = true;
    this.linewidth = 1;

    this.setValues(parameters);

    this.oldColor = this.color.clone();
    this.oldOpacity = this.opacity;

    this.highlight = function (highlighted) {
      if (highlighted) {
        this.color.copy(gizmo_colors.outline);
        this.color.r *= 1.2;
        this.color.g *= 1.2;
        this.color.b *= 1.2;
        this.opacity = 1;
      } else {
        this.color.copy(this.oldColor);
        this.opacity = this.oldOpacity;
      }
    };
  }
}

var pickerMaterial = new GizmoMaterial({
    visible: false,
    transparent: false,
    side: THREE.DoubleSide,
  });
