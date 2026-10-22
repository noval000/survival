extends CharacterBody3D

@export var walk_speed := 5.0
@export var sprint_speed := 8.0
@export var mouse_sensitivity := 0.0016
@export var jump_velocity := 6.0

@onready var head: Node3D = $Head
@onready var camera: Camera3D = $Head/Camera3D
var gravity := 18.0
var status_label: Label

func _ready() -> void:
    Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
    var hud := CanvasLayer.new()
    hud.name = "MovementDiagnostics"
    add_child(hud)
    status_label = Label.new()
    status_label.position = Vector2(20, 20)
    status_label.add_theme_font_size_override("font_size", 18)
    status_label.add_theme_color_override("font_shadow_color", Color.BLACK)
    status_label.add_theme_constant_override("shadow_offset_x", 2)
    status_label.add_theme_constant_override("shadow_offset_y", 2)
    hud.add_child(status_label)

func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_pressed("ui_cancel"):
        Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
    elif event is InputEventMouseButton and event.pressed and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
        Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
    elif event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
        # Ignore implausible driver spikes; never rotate 180 degrees on a single event.
        var mouse_delta: Vector2 = (event as InputEventMouseMotion).relative.limit_length(45.0)
        rotate_y(-mouse_delta.x * mouse_sensitivity)
        head.rotate_x(-mouse_delta.y * mouse_sensitivity)
        head.rotation.x = clampf(head.rotation.x, -1.35, 1.35)

func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y -= gravity * delta
    elif Input.is_action_just_pressed("jump"):
        velocity.y = jump_velocity

    var x_axis: float = float(Input.is_physical_key_pressed(KEY_D)) - float(Input.is_physical_key_pressed(KEY_A))
    var z_axis: float = float(Input.is_physical_key_pressed(KEY_S)) - float(Input.is_physical_key_pressed(KEY_W))
    var axis := Vector2(x_axis, z_axis).normalized()
    if axis == Vector2.ZERO:
        axis = Input.get_vector("move_left", "move_right", "move_forward", "move_backward")
    var wish := (global_transform.basis * Vector3(axis.x, 0.0, axis.y)).normalized()
    var speed := sprint_speed if Input.is_action_pressed("sprint") else walk_speed
    var accel := 15.0 if is_on_floor() else 4.0
    velocity.x = move_toward(velocity.x, wish.x * speed, accel * delta)
    velocity.z = move_toward(velocity.z, wish.z * speed, accel * delta)
    move_and_slide()
    if status_label != null:
        status_label.text = "WASD move | SPACE jump | SHIFT sprint | ESC mouse\\nInput: %s  Floor: %s  Pos: (%.1f, %.1f, %.1f)  Velocity: (%.1f, %.1f, %.1f)" % [str(axis), str(is_on_floor()), global_position.x, global_position.y, global_position.z, velocity.x, velocity.y, velocity.z]
