extends CanvasLayer

signal craft_requested(recipe: String)
signal consumable_requested(kind: String)

const ITEMS := {
    "wood": ["Древесина", "🌲"],
    "stone": ["Камень", "🪨"],
    "plank": ["Доски", "🪵"],
    "iron": ["Железная руда", "⛏"],
    "coal": ["Уголь", "⬛"],
    "iron_bar": ["Железный слиток", "🔩"],
    "berries": ["Ягоды", "🍓"],
    "bandage": ["Бинт", "✚"]
}
const RECIPES := {
    "plank": ["Доски ×2", {"wood": 5}],
    "axe": ["Топор", {"wood": 10, "stone": 5}],
    "pickaxe": ["Кирка", {"wood": 5, "stone": 10}],
    "iron_bar": ["Железный слиток", {"iron": 3, "coal": 2}],
    "bandage": ["Бинт", {"berries": 3, "plank": 2}]
}
var inventory: Dictionary = {}
var tools: Dictionary = {}
var current_tool := "axe"
var panel: PanelContainer
var hotbar_text: Label
var item_labels: Dictionary = {}
var recipe_buttons: Dictionary = {}
var use_buttons: Dictionary = {}

func _ready() -> void:
    layer = 10
    var root := Control.new()
    root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    root.mouse_filter = Control.MOUSE_FILTER_IGNORE
    add_child(root)
    hotbar_text = Label.new()
    hotbar_text.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
    hotbar_text.position = Vector2(-215, -55)
    hotbar_text.add_theme_font_size_override("font_size", 20)
    root.add_child(hotbar_text)
    panel = PanelContainer.new()
    panel.set_anchors_preset(Control.PRESET_CENTER)
    panel.position = Vector2(-365, -285)
    panel.custom_minimum_size = Vector2(730, 570)
    root.add_child(panel)
    var style := StyleBoxFlat.new()
    style.bg_color = Color(0.075, 0.095, 0.10, 0.96)
    style.border_color = Color(0.33, 0.43, 0.39)
    style.set_border_width_all(2)
    style.set_corner_radius_all(12)
    style.set_content_margin_all(18)
    panel.add_theme_stylebox_override("panel", style)
    var content := VBoxContainer.new()
    content.add_theme_constant_override("separation", 12)
    panel.add_child(content)
    var heading := Label.new()
    heading.text = "РЮКЗАК  •  I — закрыть"
    heading.add_theme_font_size_override("font_size", 26)
    content.add_child(heading)
    var columns := HBoxContainer.new()
    columns.add_theme_constant_override("separation", 22)
    content.add_child(columns)
    var left := VBoxContainer.new()
    left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    columns.add_child(left)
    var resource_title := Label.new()
    resource_title.text = "РЕСУРСЫ"
    resource_title.add_theme_font_size_override("font_size", 20)
    left.add_child(resource_title)
    var grid := GridContainer.new()
    grid.columns = 2
    grid.add_theme_constant_override("h_separation", 8)
    grid.add_theme_constant_override("v_separation", 8)
    left.add_child(grid)
    for kind in ITEMS:
        var slot := PanelContainer.new()
        slot.custom_minimum_size = Vector2(150, 88)
        var slot_style := StyleBoxFlat.new()
        slot_style.bg_color = Color(0.14, 0.18, 0.18)
        slot_style.set_corner_radius_all(7)
        slot_style.set_content_margin_all(9)
        slot.add_theme_stylebox_override("panel", slot_style)
        grid.add_child(slot)
        var cell := VBoxContainer.new()
        slot.add_child(cell)
        var icon_label := Label.new()
        icon_label.text = ITEMS[kind][1] + "  " + ITEMS[kind][0]
        icon_label.add_theme_font_size_override("font_size", 16)
        cell.add_child(icon_label)
        var amount := Label.new()
        amount.add_theme_font_size_override("font_size", 22)
        cell.add_child(amount)
        item_labels[kind] = amount
    var right := VBoxContainer.new()
    right.custom_minimum_size.x = 290
    columns.add_child(right)
    var crafting_title := Label.new()
    crafting_title.text = "ИЗГОТОВЛЕНИЕ"
    crafting_title.add_theme_font_size_override("font_size", 20)
    right.add_child(crafting_title)
    for recipe in RECIPES:
        var button := Button.new()
        button.custom_minimum_size.y = 48
        button.pressed.connect(_craft.bind(recipe))
        right.add_child(button)
        recipe_buttons[recipe] = button
    var use_title := Label.new()
    use_title.text = "ИСПОЛЬЗОВАТЬ"
    right.add_child(use_title)
    for kind in ["berries", "bandage"]:
        var button := Button.new()
        button.custom_minimum_size.y = 42
        button.pressed.connect(_consume.bind(kind))
        right.add_child(button)
        use_buttons[kind] = button
    var footer := Label.new()
    footer.text = "ЛКМ — добыча  •  E — собрать / пить  •  B — строительство"
    content.add_child(footer)
    panel.visible = false
    refresh()

func _craft(recipe: String) -> void:
    craft_requested.emit(recipe)

func _consume(kind: String) -> void:
    consumable_requested.emit(kind)

func toggle_inventory() -> bool:
    panel.visible = not panel.visible
    refresh()
    return panel.visible

func is_open() -> bool:
    return panel.visible

func set_inventory(values: Dictionary, owned_tools: Dictionary, selected: String) -> void:
    inventory = values.duplicate()
    tools = owned_tools.duplicate()
    current_tool = selected
    refresh()

func refresh() -> void:
    if hotbar_text == null:
        return
    hotbar_text.text = "[1] 🪓 ТОПОР%s      [2] ⛏ КИРКА%s      [I] РЮКЗАК" % [" ◀" if current_tool == "axe" else "", " ◀" if current_tool == "pickaxe" else ""]
    for kind in item_labels:
        var label: Label = item_labels[kind]
        label.text = "× %d" % int(inventory.get(kind, 0))
    for recipe in RECIPES:
        var info: Array = RECIPES[recipe]
        var costs: Dictionary = info[1]
        var available := true
        var parts: Array[String] = []
        for material in costs:
            var count: int = int(costs[material])
            parts.append("%s %d" % [ITEMS[material][0], count])
            if int(inventory.get(material, 0)) < count:
                available = false
        var button: Button = recipe_buttons[recipe]
        button.text = "%s\n%s" % [info[0], " + ".join(parts)]
        button.disabled = not available
    use_buttons["berries"].text = "🍓 Съесть ягоды (+25 сытости)"
    use_buttons["berries"].disabled = int(inventory.get("berries", 0)) <= 0
    use_buttons["bandage"].text = "✚ Использовать бинт (+35 здоровья)"
    use_buttons["bandage"].disabled = int(inventory.get("bandage", 0)) <= 0
