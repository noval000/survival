extends Node3D

var island: Node3D

func configure(world: Node3D) -> void:
    island = world

func _ready() -> void:
    var rng := RandomNumberGenerator.new()
    rng.seed = 45219
    for i in range(18):
        var angle: float = rng.randf_range(0.0, TAU)
        var radius: float = rng.randf_range(13.0, 48.0)
        var x: float = cos(angle) * radius
        var z: float = sin(angle) * radius
        make_resource(Vector3(x, float(island.call("height_at", x, z)) + 0.45, z), "berries")
    for point in [Vector2(10.0, 11.0), Vector2(-24.0, 15.0), Vector2(22.0, -21.0)]:
        make_resource(Vector3(point.x, float(island.call("height_at", point.x, point.y)) + 0.45, point.y), "water")

func make_resource(at: Vector3, kind: String) -> void:
    var area := Area3D.new()
    area.name = "BerryBush" if kind == "berries" else "FreshwaterWell"
    area.add_to_group("survival_interactable")
    area.set_meta("interaction", kind)
    area.set_meta("quantity", 3 if kind == "berries" else -1)
    area.position = at
    add_child(area)
    var collision := CollisionShape3D.new()
    var shape := SphereShape3D.new()
    shape.radius = 1.0
    collision.shape = shape
    area.add_child(collision)
    var view := MeshInstance3D.new()
    if kind == "berries":
        var bush := SphereMesh.new()
        bush.radius = 0.65
        bush.height = 1.2
        view.mesh = bush
    else:
        var well := CylinderMesh.new()
        well.top_radius = 0.8
        well.bottom_radius = 0.8
        well.height = 0.9
        view.mesh = well
    var material := StandardMaterial3D.new()
    material.albedo_color = Color(0.18, 0.38, 0.15) if kind == "berries" else Color(0.18, 0.51, 0.72)
    view.material_override = material
    area.add_child(view)
