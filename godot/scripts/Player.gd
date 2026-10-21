extends CharacterBody3D

@export var walk_speed := 5.0
@export var sprint_speed := 8.0
@export var mouse_sensitivity := 0.0016
@export var jump_velocity := 6.0

@onready var head: Node3D = $Head
@onready var camera: Camera3D = $Head/Camera3D
var gravity := 18.0

func _ready() -> void:
    Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_pressed("ui_cancel"):
        Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
    elif event is InputEventMouseButton and event.pressed and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
        Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
    elif event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
        # Ignore implausible driver spikes; never rotate 180 degrees on a single event.
        var delta := event.relative.limit_length(45.0)
        rotate_y(-delta.x * mouse_sensitivity)
        head.rotate_x(-delta.y * mouse_sensitivity)
        head.rotation.x = clampf(head.rotation.x, -1.35, 1.35)

func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y -= gravity * delta
    elif Input.is_action_just_pressed("jump"):
        velocity.y = jump_velocity

    var axis := Input.get_vector("move_left", "move_right", "move_forward", "move_backward")
    var wish := (global_transform.basis * Vector3(axis.x, 0.0, axis.y)).normalized()
    var speed := sprint_speed if Input.is_action_pressed("sprint") else walk_speed
    var accel := 15.0 if is_on_floor() else 4.0
    velocity.x = move_toward(velocity.x, wish.x * speed, accel * delta)
    velocity.z = move_toward(velocity.z, wish.z * speed, accel * delta)
    move_and_slide()
