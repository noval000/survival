extends Node3D

# Walk-in surface mine with roof, ore veins, and warm lamps.
# The island heightmap remains intact; underground excavation comes later.
const HARVESTABLE = preload("res://scripts/Harvestable.gd")
var world: Node3D

func configure(island: Node3D) -> void:
    world = island

func _ready() -> void:
    if world == null:
        return
    build_mine(Vector2(30.0, 25.0))

func make_block(parent: Node3D, center: Vector3, size: Vector3, color: Color, solid: bool = true) -> void:
    var mesh := BoxMesh.new()
    mesh.size = size
    var mat := StandardMaterial3D.new()
    mat.albedo_color = color
    mat.roughness = 0.96
    var view := MeshInstance3D.new()
    view.mesh = mesh
    view.material_override = mat
    view.position = center
    parent.add_child(view)
    if solid:
        var body := StaticBody3D.new()
        body.position = center
        var collision := CollisionShape3D.new()
        var shape := BoxShape3D.new()
        shape.size = size
        collision.shape = shape
        body.add_child(collision)
        parent.add_child(body)

func build_mine(origin: Vector2) -> void:
    var floor_y: float = world.call("height_at", origin.x, origin.y) + 0.08
    var base := Node3D.new()
    base.name = "OldMine"
    base.position = Vector3(origin.x, floor_y, origin.y)
    add_child(base)
    # Elevated wooden passage avoids cutting into the terrain collider.
    make_block(base, Vector3(0, 0.02, 0), Vector3(8, 0.2, 24), Color(0.23, 0.18, 0.12), false)
    for z in range(-10, 11, 4):
        var zz := float(z)
        make_block(base, Vector3(-3.7, 2.0, zz), Vector3(0.6, 4.0, 0.6), Color(0.26, 0.18, 0.10))
        make_block(base, Vector3(3.7, 2.0, zz), Vector3(0.6, 4.0, 0.6), Color(0.26, 0.18, 0.10))
        make_block(base, Vector3(0, 4.1, zz), Vector3(8.0, 0.55, 0.7), Color(0.26, 0.18, 0.10))
    make_block(base, Vector3(-4.0, 2.8, 0), Vector3(0.6, 5.6, 24), Color(0.25, 0.25, 0.23))
    make_block(base, Vector3(4.0, 2.8, 0), Vector3(0.6, 5.6, 24), Color(0.25, 0.25, 0.23))
    make_block(base, Vector3(0, 5.4, 0), Vector3(8.7, 0.6, 24), Color(0.25, 0.25, 0.23))
    var rng := RandomNumberGenerator.new()
    rng.seed = 11709
    for i in range(12):
        var kind: String = "iron" if i % 2 == 0 else "coal"
        var x: float = -2.5 if i % 2 == 0 else 2.5
        var z: float = -9.0 + float(i) * 1.6
        var body := StaticBody3D.new()
        body.set_script(HARVESTABLE)
        body.set("resource_type", kind)
        body.set("max_health", 90 if kind == "iron" else 65)
        body.set("yield_amount", 12 if kind == "iron" else 16)
        body.position = Vector3(x, 0.9, z)
        base.add_child(body)
        var rock := MeshInstance3D.new()
        var rock_mesh := SphereMesh.new()
        rock_mesh.radius = 0.75
        rock_mesh.height = 1.5
        rock.mesh = rock_mesh
        var rock_mat := StandardMaterial3D.new()
        rock_mat.albedo_color = Color(0.34, 0.24, 0.17) if kind == "iron" else Color(0.11, 0.12, 0.14)
        rock.material_override = rock_mat
        body.add_child(rock)
        var collision := CollisionShape3D.new()
        var sphere := SphereShape3D.new()
        sphere.radius = 0.78
        collision.shape = sphere
        body.add_child(collision)
        body.set_meta("visual", rock)
    for z in [-8.0, 0.0, 8.0]:
        var lamp := OmniLight3D.new()
        lamp.position = Vector3(0, 3.5, z)
        lamp.light_color = Color(1.0, 0.70, 0.37)
        lamp.light_energy = 1.2
        lamp.omni_range = 8.0
        lamp.shadow_enabled = false
        base.add_child(lamp)
    var sign := Label3D.new()
    sign.text = "OLD MINE - IRON / COAL"
    sign.font_size = 45
    sign.pixel_size = 0.008
    sign.position = Vector3(0, 4.65, 12.4)
    base.add_child(sign)
