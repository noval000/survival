extends CanvasLayer

# Сенсорное управление: левый джойстик, прыжок, бег и действие.
signal action_pressed
signal jump_pressed
signal sprint_changed(pressed: bool)
var move_vector := Vector2.ZERO
var touch_index := -1
var origin := Vector2.ZERO
var base: PanelContainer
var thumb: ColorRect

func _ready() -> void:
    layer = 14
    visible = OS.has_feature("mobile")
    var root := Control.new()
    root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    root.mouse_filter = Control.MOUSE_FILTER_IGNORE
    add_child(root)
    base = PanelContainer.new()
    base.position = Vector2(55, 475)
    base.custom_minimum_size = Vector2(145, 145)
    var style := StyleBoxFlat.new()
    style.bg_color = Color(0.12, 0.17, 0.19, 0.6)
    style.border_color = Color(0.83, 0.64, 0.36, 0.8)
    style.set_border_width_all(2)
    style.set_corner_radius_all(72)
    base.add_theme_stylebox_override("panel", style)
    base.mouse_filter = Control.MOUSE_FILTER_IGNORE
    root.add_child(base)
    thumb = ColorRect.new()
    thumb.color = Color(0.85, 0.69, 0.43, 0.75)
    thumb.size = Vector2(48, 48)
    thumb.position = Vector2(48, 48)
    thumb.mouse_filter = Control.MOUSE_FILTER_IGNORE
    base.add_child(thumb)
    var action := Button.new()
    action.text = "ДЕЙСТВИЕ"
    action.position = Vector2(1030, 520)
    action.custom_minimum_size = Vector2(135, 65)
    action.pressed.connect(func() -> void: action_pressed.emit())
    root.add_child(action)
    var jump := Button.new()
    jump.text = "ПРЫЖОК"
    jump.position = Vector2(1120, 425)
    jump.custom_minimum_size = Vector2(120, 60)
    jump.pressed.connect(func() -> void: jump_pressed.emit())
    root.add_child(jump)
    var sprint := Button.new()
    sprint.text = "БЕГ"
    sprint.position = Vector2(925, 430)
    sprint.custom_minimum_size = Vector2(100, 60)
    sprint.button_down.connect(func() -> void: sprint_changed.emit(true))
    sprint.button_up.connect(func() -> void: sprint_changed.emit(false))
    root.add_child(sprint)

func _input(event: InputEvent) -> void:
    if not visible:
        return
    if event is InputEventScreenTouch:
        if event.pressed and touch_index == -1 and event.position.x < 280.0 and event.position.y > 380.0:
            touch_index = event.index
            origin = event.position
            update_stick(event.position)
        elif not event.pressed and event.index == touch_index:
            touch_index = -1
            move_vector = Vector2.ZERO
            thumb.position = Vector2(48, 48)
    elif event is InputEventScreenDrag and event.index == touch_index:
        update_stick(event.position)

func update_stick(position: Vector2) -> void:
    move_vector = ((position - origin) / 65.0).limit_length(1.0)
    thumb.position = Vector2(48, 48) + move_vector * 42.0
