BARS.defineActions(function () {
  new BarSelect("view_mode", {
    category: "view",
    keybind: new Keybind({ key: "z" }),
    condition: () =>
      Project &&
      Toolbox &&
      Toolbox.selected &&
      (!Toolbox.selected.allowed_view_modes ||
        Toolbox.selected.allowed_view_modes.length > 1),
    value: "textured",
    options: {
      textured: {
        name: true,
        condition: () =>
          !Toolbox.selected.allowed_view_modes ||
          Toolbox.selected.allowed_view_modes.includes("textured"),
      },
      solid: {
        name: true,
        condition: () =>
          !Toolbox.selected.allowed_view_modes ||
          Toolbox.selected.allowed_view_modes.includes("solid"),
      },
      wireframe: {
        name: true,
        condition: () =>
          !Toolbox.selected.allowed_view_modes ||
          Toolbox.selected.allowed_view_modes.includes("wireframe"),
      },
      normal: {
        name: true,
        condition: () =>
          (!Toolbox.selected.allowed_view_modes ||
            Toolbox.selected.allowed_view_modes.includes("normal")) &&
          Mesh.all.length,
      },
    },
    onChange() {
      Project.view_mode = this.value;
      Canvas.updateAllFaces();
      if (Modes.id === "animate") {
        Animator.preview();
      }
      //Blockbench.showQuickMessage(tl('action.view_mode') + ': ' + tl('action.view_mode.' + this.value));
    },
  });
  new Toggle("preview_checkerboard", {
    icon: "fas.fa-chess-board",
    category: "view",
    linked_setting: "preview_checkerboard",
    keybind: new Keybind({ key: "t" }),
  });
  new Toggle("uv_checkerboard", {
    icon: "fas.fa-chess-board",
    category: "view",
    linked_setting: "uv_checkerboard",
  });
  new Toggle("toggle_shading", {
    name: tl("settings.shading"),
    description: tl("settings.shading.desc"),
    icon: "wb_sunny",
    category: "view",
    linked_setting: "shading",
  });
  new Toggle("toggle_ground_plane", {
    name: tl("settings.ground_plane"),
    description: tl("settings.ground_plane.desc"),
    icon: "icon-format_free",
    category: "view",
    linked_setting: "ground_plane",
  });
  new Toggle("toggle_motion_trails", {
    name: tl("settings.motion_trails"),
    description: tl("settings.motion_trails.desc"),
    icon: "gesture",
    category: "view",
    linked_setting: "motion_trails",
    condition: { modes: ["animate"] },
  });

  new Action("toggle_quad_view", {
    icon: "grid_view",
    category: "view",
    condition: () => !Modes.display,
    keybind: new Keybind({ key: 9 }),
    click: function () {
      main_preview.toggleFullscreen();
    },
  });
  new Action("focus_on_selection", {
    icon: "center_focus_weak",
    category: "view",
    condition: () => !Modes.display,
    click: function () {
      if (Prop.active_panel == "uv") {
        UVEditor.focusOnSelection();
      } else {
        let preview = quad_previews.current;
        let center = new THREE.Vector3().fromArray(getSelectionCenter());
        center.add(scene.position);

        let difference = new THREE.Vector3()
          .copy(preview.controls.target)
          .sub(center);
        difference.divideScalar(6);

        let i = 0;
        let interval = setInterval(() => {
          preview.controls.target.sub(difference);

          if (preview.angle != null) {
            preview.camera.position.sub(difference);
          }
          i++;
          if (i == 6) clearInterval(interval);
        }, 16.66);
      }
    },
  });

  new Action("toggle_camera_projection", {
    icon: "switch_video",
    category: "view",
    condition: (_) => !preview.movingBackground || !Modes.display,
    keybind: new Keybind({ key: 101 }),
    click: function () {
      quad_previews.current.setProjectionMode(
        !quad_previews.current.isOrtho,
        true
      );
    },
  });
  new Action("camera_initial", {
    name: tl("action.load_camera_angle", tl("menu.preview.angle.initial")),
    description: tl(
      "action.load_camera_angle.desc",
      tl("menu.preview.angle.initial")
    ),
    icon: "videocam",
    color: "y",
    category: "view",
    condition: (_) => !Modes.display,
    keybind: new Keybind({ key: 97 }),
    click: function () {
      quad_previews.current.loadAnglePreset(DefaultCameraPresets[0]);
    },
  });
  new Action("camera_top", {
    name: tl("action.load_camera_angle", tl("direction.top")),
    description: tl("action.load_camera_angle.desc", tl("direction.top")),
    icon: "videocam",
    color: "y",
    category: "view",
    condition: (_) => !Modes.display,
    keybind: new Keybind({ key: 104 }),
    click: function () {
      quad_previews.current.loadAnglePreset(DefaultCameraPresets[1]);
    },
  });
  new Action("camera_bottom", {
    name: tl("action.load_camera_angle", tl("direction.bottom")),
    description: tl("action.load_camera_angle.desc", tl("direction.bottom")),
    icon: "videocam",
    color: "y",
    category: "view",
    condition: (_) => !Modes.display,
    keybind: new Keybind({ key: 98 }),
    click: function () {
      quad_previews.current.loadAnglePreset(DefaultCameraPresets[2]);
    },
  });
  new Action("camera_south", {
    name: tl("action.load_camera_angle", tl("direction.south")),
    description: tl("action.load_camera_angle.desc", tl("direction.south")),
    icon: "videocam",
    color: "z",
    category: "view",
    condition: (_) => !Modes.display,
    keybind: new Keybind({ key: 100 }),
    click: function () {
      quad_previews.current.loadAnglePreset(DefaultCameraPresets[3]);
    },
  });
  new Action("camera_north", {
    name: tl("action.load_camera_angle", tl("direction.north")),
    description: tl("action.load_camera_angle.desc", tl("direction.north")),
    icon: "videocam",
    color: "z",
    category: "view",
    condition: (_) => !Modes.display,
    keybind: new Keybind({ key: 102 }),
    click: function () {
      quad_previews.current.loadAnglePreset(DefaultCameraPresets[4]);
    },
  });
  new Action("camera_east", {
    name: tl("action.load_camera_angle", tl("direction.east")),
    description: tl("action.load_camera_angle.desc", tl("direction.east")),
    icon: "videocam",
    color: "x",
    category: "view",
    condition: (_) => !Modes.display,
    keybind: new Keybind({ key: 103 }),
    click: function () {
      quad_previews.current.loadAnglePreset(DefaultCameraPresets[5]);
    },
  });
  new Action("camera_west", {
    name: tl("action.load_camera_angle", tl("direction.west")),
    description: tl("action.load_camera_angle.desc", tl("direction.west")),
    icon: "videocam",
    color: "x",
    category: "view",
    condition: (_) => !Modes.display,
    keybind: new Keybind({ key: 105 }),
    click: function () {
      quad_previews.current.loadAnglePreset(DefaultCameraPresets[6]);
    },
  });
});
