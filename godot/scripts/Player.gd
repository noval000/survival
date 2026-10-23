extends CharacterBody3D

const INVENTORY_UI_SCRIPT = preload("res://scripts/InventoryUI.gd")
const BUILDING_SCRIPT = preload("res://scripts/BuildingSystem.gd")
const SURVIVAL_UI_SCRIPT = preload("res://scripts/SurvivalUI.gd")
const SAVE_GAME = preload("res://scripts/SaveGame.gd")
const BUILDING_HUD_SCRIPT = preload("res://scripts/BuildingHUD.gd")

@export var walk_speed := 5.0
@export var sprint_speed := 8.0
@export var mouse_sensitivity := 0.0016
@export var jump_velocity := 6.0

@onready var head: Node3D = $Head
@onready var camera: Camera3D = $Head/Camera3D
var gravity := 18.0
var status_label: Label
var arm_root: Node3D
var left_arm: Node3D
var right_arm: Node3D
var camera_home: Vector3
var gait_time: float = 0.0
var landing: float = 0.0
var was_grounded: bool = false
var last_vertical_speed: float = 0.0
var step_distance: float = 0.0
var footstep: AudioStreamPlayer
var resources: Dictionary = {"wood": 0, "stone": 0, "plank": 0, "iron": 0, "coal": 0, "iron_bar": 0, "berries": 0, "bandage": 0}
var owned_tools: Dictionary = {"axe": true, "pickaxe": true}
var inventory_ui: CanvasLayer
var building: Node3D
var survival_ui: CanvasLayer
var building_hud: CanvasLayer
var health: float = 100.0
var hunger: float = 100.0
var thirst: float = 100.0
var dead := false
var survival_tick: float = 0.0
var autosave_tick: float = 0.0
var equipped_tool: String = "axe"
var harvest_cooldown: float = 0.0
var resource_label: Label
var tool_visual: Node3D
var swing_time: float = 0.0
var harvest_feedback: Label
var feedback_remaining: float = 0.0

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
    resource_label = Label.new()
    resource_label.position = Vector2(20, 90)
    resource_label.add_theme_font_size_override("font_size", 19)
    hud.add_child(resource_label)
    harvest_feedback = Label.new()
    harvest_feedback.position = Vector2(20, 150)
    harvest_feedback.add_theme_font_size_override("font_size", 20)
    hud.add_child(harvest_feedback)
    camera_home = camera.position
    setup_arms()
    setup_footstep()
    setup_tool()
    inventory_ui = INVENTORY_UI_SCRIPT.new()
    inventory_ui.name = "InventoryUI"
    add_child(inventory_ui)
    inventory_ui.craft_requested.connect(craft_item)
    inventory_ui.consumable_requested.connect(use_consumable)
    sync_inventory()
    building = BUILDING_SCRIPT.new()
    building.name = "BuildingSystem"
    building.configure(self, camera, get_parent().get_node("IslandWorld"))
    get_parent().add_child.call_deferred(building)
    survival_ui = SURVIVAL_UI_SCRIPT.new()
    survival_ui.name = "SurvivalUI"
    add_child(survival_ui)
    survival_ui.respawn_requested.connect(respawn)
    building_hud = BUILDING_HUD_SCRIPT.new()
    add_child(building_hud)
    building_hud.piece_requested.connect(func(kind: String) -> void: building.choose_piece(kind))
    load_progress.call_deferred()

func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventKey and event.pressed and not event.echo:
        if event.physical_keycode == KEY_E and not inventory_ui.is_open():
            try_interact()
            return
        if event.physical_keycode == KEY_F5:
            save_progress()
            return
        if event.physical_keycode == KEY_F9:
            load_progress()
            return
        if dead:
            return
        if event.physical_keycode == KEY_I:
            var opened: bool = inventory_ui.toggle_inventory()
            Input.mouse_mode = Input.MOUSE_MODE_VISIBLE if opened else Input.MOUSE_MODE_CAPTURED
            get_viewport().set_input_as_handled()
            return
        if event.physical_keycode == KEY_ESCAPE:
            if inventory_ui.is_open():
                inventory_ui.toggle_inventory()
                Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
            else:
                Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
            get_viewport().set_input_as_handled()
            return
        if not inventory_ui.is_open():
            if event.physical_keycode == KEY_B:
                building.set_active(not building.active)
                get_viewport().set_input_as_handled()
                return
            if building.active:
                if event.physical_keycode == KEY_1:
                    building.choose_piece("foundation")
                elif event.physical_keycode == KEY_2:
                    building.choose_piece("wall")
                elif event.physical_keycode == KEY_3:
                    building.choose_piece("doorway")
                elif event.physical_keycode == KEY_4:
                    building.choose_piece("roof")
                elif event.physical_keycode == KEY_R:
                    building.rotate_piece()
                get_viewport().set_input_as_handled()
                return
            if event.physical_keycode == KEY_1:
                equipped_tool = "axe"
                setup_tool()
                sync_inventory()
            elif event.physical_keycode == KEY_2:
                equipped_tool = "pickaxe"
                setup_tool()
                sync_inventory()
    elif event is InputEventMouseButton and event.pressed and Input.mouse_mode != Input.MOUSE_MODE_CAPTURED and not inventory_ui.is_open():
        Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
    elif event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
        var mouse_delta: Vector2 = (event as InputEventMouseMotion).relative.limit_length(45.0)
        rotate_y(-mouse_delta.x * mouse_sensitivity)
        head.rotate_x(-mouse_delta.y * mouse_sensitivity)
        head.rotation.x = clampf(head.rotation.x, -1.35, 1.35)

func _physics_process(delta: float) -> void:
    survival_tick += delta
    autosave_tick += delta
    if survival_tick >= 1.0 and not dead:
        var elapsed: float = survival_tick
        survival_tick = 0.0
        hunger = maxf(0.0, hunger - elapsed * 0.035)
        thirst = maxf(0.0, thirst - elapsed * 0.06)
        if hunger <= 0.0 or thirst <= 0.0:
            take_damage(elapsed * 2.0)
        survival_ui.update_stats(health, hunger, thirst)
    if autosave_tick >= 60.0 and not dead:
        autosave_tick = 0.0
        save_progress()
    if dead:
        velocity = Vector3.ZERO
        return
    harvest_cooldown = maxf(0.0, harvest_cooldown - delta)
    swing_time = maxf(0.0, swing_time - delta)
    feedback_remaining = maxf(0.0, feedback_remaining - delta)
    if feedback_remaining <= 0.0 and harvest_feedback != null:
        harvest_feedback.text = ""
    if tool_visual != null:
        var swing: float = sin((1.0 - swing_time / 0.4) * PI) if swing_time > 0.0 else 0.0
        tool_visual.rotation.x = lerpf(tool_visual.rotation.x, -0.4 - swing, minf(delta * 20.0, 1.0))
    if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT) and harvest_cooldown <= 0.0:
        if building != null and building.active:
            harvest_cooldown = 0.25
            if building.place_piece(resources):
                sync_inventory()
                feedback_remaining = 1.3
                harvest_feedback.text = "Построено: %s" % building.piece_type
            else:
                feedback_remaining = 0.8
                harvest_feedback.text = "Нельзя построить: место занято или мало ресурсов"
        else:
            try_harvest()
    if resource_label != null:
        resource_label.text = "B — строительство | 1–4 — выбор | R — поворот | ЛКМ — поставить" if building != null and building.active else "ЛКМ — добыча | E — собрать / пить | I — рюкзак | B — строительство"
    if building_hud != null and building != null:
        building_hud.update_building(building.active, building.piece_type, building.ghost_valid, resources)
    if not is_on_floor():
        velocity.y -= gravity * delta
    elif Input.is_action_just_pressed("jump") or Input.is_physical_key_pressed(KEY_SPACE):
        velocity.y = jump_velocity

    var x_axis: float = float(Input.is_physical_key_pressed(KEY_D)) - float(Input.is_physical_key_pressed(KEY_A))
    var z_axis: float = float(Input.is_physical_key_pressed(KEY_S)) - float(Input.is_physical_key_pressed(KEY_W))
    var axis := Vector2(x_axis, z_axis).normalized()
    if axis == Vector2.ZERO:
        axis = Input.get_vector("move_left", "move_right", "move_forward", "move_backward")
    var wish := (global_transform.basis * Vector3(axis.x, 0.0, axis.y)).normalized()
    var running: bool = Input.is_action_pressed("sprint") or Input.is_physical_key_pressed(KEY_SHIFT)
    var speed := sprint_speed if running else walk_speed
    var accel := 15.0 if is_on_floor() else 4.0
    velocity.x = move_toward(velocity.x, wish.x * speed, accel * delta)
    velocity.z = move_toward(velocity.z, wish.z * speed, accel * delta)
    var fall_speed: float = velocity.y
    var previously_grounded: bool = is_on_floor()
    last_vertical_speed = velocity.y
    move_and_slide()
    if is_on_floor() and not previously_grounded and fall_speed < -12.0:
        take_damage((absf(fall_speed) - 12.0) * 4.0)
    animate_movement(delta, running)
    if status_label != null:
        status_label.text = "WASD — идти | ПРОБЕЛ — прыжок | SHIFT — бег | ESC — курсор\\nНаправление: %s  На земле: %s  Позиция: (%.1f, %.1f, %.1f)  Скорость: (%.1f, %.1f, %.1f)" % [str(axis), str(is_on_floor()), global_position.x, global_position.y, global_position.z, velocity.x, velocity.y, velocity.z]

func setup_arms() -> void:
    arm_root = Node3D.new()
    arm_root.name = "FPSViewmodel"
    camera.add_child(arm_root)
    var sleeve := StandardMaterial3D.new()
    sleeve.albedo_color = Color(0.23, 0.30, 0.27)
    var glove := StandardMaterial3D.new()
    glove.albedo_color = Color(0.37, 0.28, 0.20)
    left_arm = make_arm(-1.0, sleeve, glove)
    right_arm = make_arm(1.0, sleeve, glove)

func make_arm(side: float, sleeve: Material, glove: Material) -> Node3D:
    var pivot := Node3D.new()
    pivot.name = "LeftArm" if side < 0.0 else "RightArm"
    pivot.position = Vector3(side * 0.40, -0.40, -0.70)
    pivot.rotation = Vector3(-0.4, side * 0.2, side * 0.15)
    arm_root.add_child(pivot)
    var mesh := CylinderMesh.new()
    mesh.top_radius = 0.10
    mesh.bottom_radius = 0.14
    mesh.height = 0.57
    var sleeve_mesh := MeshInstance3D.new()
    sleeve_mesh.mesh = mesh
    sleeve_mesh.material_override = sleeve
    sleeve_mesh.position = Vector3(0.0, -0.13, -0.12)
    sleeve_mesh.rotation.x = 1.0
    pivot.add_child(sleeve_mesh)
    var palm := SphereMesh.new()
    palm.radius = 0.11
    palm.height = 0.22
    var hand := MeshInstance3D.new()
    hand.mesh = palm
    hand.material_override = glove
    hand.position = Vector3(0.0, -0.30, -0.31)
    pivot.add_child(hand)
    return pivot

func animate_movement(delta: float, running: bool) -> void:
    var speed: float = Vector2(velocity.x, velocity.z).length()
    var moving: bool = is_on_floor() and speed > 0.3
    var strength: float = clampf(speed / sprint_speed, 0.0, 1.0)
    if moving:
        gait_time += delta * (12.0 if running else 9.0)
        step_distance += speed * delta
        var interval: float = 2.2 if running else 1.7
        if step_distance >= interval:
            step_distance = fmod(step_distance, interval)
            if footstep != null:
                footstep.pitch_scale = randf_range(0.93, 1.07)
                footstep.play()
    else:
        step_distance = 0.0
    if is_on_floor() and not was_grounded:
        landing = clampf(last_vertical_speed * 0.014, -0.12, 0.0)
    was_grounded = is_on_floor()
    landing = lerpf(landing, 0.0, minf(delta * 9.0, 1.0))
    var bob_x: float = cos(gait_time) * 0.014 * strength if moving else 0.0
    var bob_y: float = absf(sin(gait_time)) * 0.03 * strength if moving else 0.0
    camera.position = camera.position.lerp(camera_home + Vector3(bob_x, bob_y + landing, 0.0), minf(delta * 12.0, 1.0))
    var swing: float = sin(gait_time) * 0.2 * strength if moving else 0.0
    left_arm.rotation.x = lerpf(left_arm.rotation.x, -0.4 + swing, minf(delta * 10.0, 1.0))
    right_arm.rotation.x = lerpf(right_arm.rotation.x, -0.4 - swing, minf(delta * 10.0, 1.0))
    arm_root.position.y = lerpf(arm_root.position.y, bob_y * 0.5 + landing * 0.5, minf(delta * 10.0, 1.0))

func setup_footstep() -> void:
    footstep = AudioStreamPlayer.new()
    footstep.name = "FootstepAudio"
    footstep.volume_db = -18.0
    add_child(footstep)
    var samples: int = 1800
    var bytes := PackedByteArray()
    bytes.resize(samples * 2)
    var noise := RandomNumberGenerator.new()
    noise.seed = 4188
    var filtered: float = 0.0
    for i in range(samples):
        var progress: float = float(i) / float(samples)
        filtered = lerpf(filtered, noise.randf_range(-1.0, 1.0), 0.24)
        var value: float = clampf(filtered * pow(1.0 - progress, 2.5) * 0.55, -1.0, 1.0)
        bytes.encode_s16(i * 2, int(value * 32767.0))
    var wave := AudioStreamWAV.new()
    wave.format = AudioStreamWAV.FORMAT_16_BITS
    wave.mix_rate = 22050
    wave.stereo = false
    wave.data = bytes
    footstep.stream = wave

func try_harvest() -> void:
    harvest_cooldown = 0.55
    swing_time = 0.4
    var query := PhysicsRayQueryParameters3D.create(camera.global_position, camera.global_position - camera.global_transform.basis.z * 3.5)
    query.exclude = [get_rid()]
    var hit: Dictionary = get_world_3d().direct_space_state.intersect_ray(query)
    if hit.is_empty():
        return
    var target: Node3D = hit.get("collider") as Node3D
    if target == null or not target.is_in_group("harvestable"):
        return
    var result: Dictionary = target.call("harvest", equipped_tool, 25)
    for kind in result:
        resources[kind] = int(resources.get(kind, 0)) + int(result[kind])
        feedback_remaining = 1.25
        harvest_feedback.text = "+%d %s" % [int(result[kind]), str(kind)]
    if not result.is_empty():
        sync_inventory()
    if bool(target.get("depleted")):
        var visual: Node3D = target.get_meta("visual", null) as Node3D
        if visual != null:
            visual.visible = false
        var world: Node = get_parent().get_node_or_null("IslandWorld")
        if world != null:
            var entries: Array = world.get("lod_trees")
            for entry in entries:
                if entry["near"] == visual:
                    entry["depleted"] = true
                    var distant: Node3D = entry["far"]
                    distant.visible = false

func setup_tool() -> void:
    if arm_root == null:
        return
    if tool_visual != null:
        tool_visual.queue_free()
    tool_visual = Node3D.new()
    tool_visual.name = "EquippedTool"
    tool_visual.position = Vector3(0.43, -0.46, -0.85)
    tool_visual.rotation.x = -0.4
    arm_root.add_child(tool_visual)
    var wood := StandardMaterial3D.new()
    wood.albedo_color = Color(0.30, 0.19, 0.10)
    var metal := StandardMaterial3D.new()
    metal.albedo_color = Color(0.45, 0.49, 0.52)
    metal.metallic = 0.55
    var handle := CylinderMesh.new()
    handle.top_radius = 0.035
    handle.bottom_radius = 0.042
    handle.height = 0.95
    var shaft := MeshInstance3D.new()
    shaft.mesh = handle
    shaft.material_override = wood
    tool_visual.add_child(shaft)
    var head_mesh := BoxMesh.new()
    if equipped_tool == "pickaxe":
        head_mesh.size = Vector3(0.44, 0.13, 0.12)
    else:
        head_mesh.size = Vector3(0.27, 0.26, 0.11)
    var head_node := MeshInstance3D.new()
    head_node.mesh = head_mesh
    head_node.material_override = metal
    head_node.position = Vector3(0.05, 0.41, 0.0)
    tool_visual.add_child(head_node)

func sync_inventory() -> void:
    if inventory_ui != null:
        inventory_ui.set_inventory(resources, owned_tools, equipped_tool)

func craft_item(recipe: String, quantity: int = 1) -> void:
    quantity = clampi(quantity, 1, 9999)
    var costs: Dictionary = {}
    if recipe == "iron_bar":
        costs = {"iron": 3, "coal": 2}
    elif recipe == "bandage":
        costs = {"berries": 3, "wood": 2}
    elif recipe == "axe":
        costs = {"wood": 10, "stone": 5}
    elif recipe == "pickaxe":
        costs = {"wood": 5, "stone": 10}
    else:
        return
    for material in costs:
        if int(resources.get(material, 0)) < int(costs[material]) * quantity:
            show_message("Не хватает ресурсов")
            return
    for material in costs:
        resources[material] = int(resources.get(material, 0)) - int(costs[material]) * quantity
    if recipe in ["iron_bar", "bandage"]:
        resources[recipe] = int(resources.get(recipe, 0)) + quantity
    else:
        owned_tools[recipe] = true
        equipped_tool = recipe
        setup_tool()
    sync_inventory()
    show_message("Создано: %s ×%d" % [recipe, quantity])

func take_damage(amount: float) -> void:
    if dead:
        return
    health = maxf(0.0, health - amount)
    survival_ui.update_stats(health, hunger, thirst)
    if health <= 0.0:
        dead = true
        building.set_active(false)
        survival_ui.set_dead(true)
        Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func respawn() -> void:
    dead = false
    health = 100.0
    hunger = 75.0
    thirst = 75.0
    global_position = Vector3(0.0, 3.0, 0.0)
    velocity = Vector3.ZERO
    survival_ui.set_dead(false)
    survival_ui.update_stats(health, hunger, thirst)
    Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
    save_progress()

func save_progress() -> void:
    if building == null or not building.is_inside_tree():
        return
    if SAVE_GAME.save_game(self, building):
        feedback_remaining = 1.5
        harvest_feedback.text = "Игра сохранена"

func load_progress() -> void:
    if building == null or not building.is_inside_tree():
        return
    var data: Dictionary = SAVE_GAME.load_game()
    if data.is_empty():
        return
    var coords: Array = data.get("position", [])
    if coords.size() == 3:
        global_position = Vector3(float(coords[0]), float(coords[1]), float(coords[2]))
        velocity = Vector3.ZERO
    var saved_resources: Dictionary = data.get("resources", {})
    for key in resources:
        resources[key] = maxi(0, int(saved_resources.get(key, 0)))
    equipped_tool = str(data.get("equipped_tool", "axe"))
    if equipped_tool not in ["axe", "pickaxe"]:
        equipped_tool = "axe"
    health = clampf(float(data.get("health", 100.0)), 1.0, 100.0)
    hunger = clampf(float(data.get("hunger", 100.0)), 0.0, 100.0)
    thirst = clampf(float(data.get("thirst", 100.0)), 0.0, 100.0)
    dead = false
    survival_ui.set_dead(false)
    survival_ui.update_stats(health, hunger, thirst)
    for child in building.get_children():
        if child is StaticBody3D and child.name.begins_with("Built_"):
            child.queue_free()
    building.placed.clear()
    var structures: Array = data.get("structures", [])
    building.restore_structures(structures)
    setup_tool()
    sync_inventory()

func try_interact() -> void:
    var query := PhysicsRayQueryParameters3D.create(camera.global_position, camera.global_position - camera.global_transform.basis.z * 4.0)
    query.collide_with_areas = true
    query.exclude = [get_rid()]
    var hit: Dictionary = get_world_3d().direct_space_state.intersect_ray(query)
    if hit.is_empty():
        return
    var target: Node = hit.get("collider") as Node
    if target == null or not target.is_in_group("survival_interactable"):
        return
    var kind: String = str(target.get_meta("interaction", ""))
    if kind == "berries":
        var quantity: int = int(target.get_meta("quantity", 0))
        if quantity <= 0:
            return
        resources["berries"] = int(resources.get("berries", 0)) + quantity
        target.set_meta("quantity", 0)
        target.visible = false
        target.set_deferred("monitorable", false)
        show_message("Собрано ягод: %d" % quantity)
        sync_inventory()
    elif kind == "water":
        thirst = minf(100.0, thirst + 45.0)
        survival_ui.update_stats(health, hunger, thirst)
        show_message("Вы попили: +45 жажды")

func use_consumable(kind: String) -> void:
    if dead or int(resources.get(kind, 0)) <= 0:
        return
    if kind == "berries":
        hunger = minf(100.0, hunger + 25.0)
    elif kind == "bandage":
        health = minf(100.0, health + 35.0)
    else:
        return
    resources[kind] = int(resources[kind]) - 1
    survival_ui.update_stats(health, hunger, thirst)
    sync_inventory()
    show_message("Использовано: " + ("ягоды" if kind == "berries" else "бинт"))

func show_message(message: String) -> void:
    feedback_remaining = 1.6
    harvest_feedback.text = message
