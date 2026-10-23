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
var item_slots: Dictionary = {}
var recipe_buttons: Dictionary = {}
var use_buttons: Dictionary = {}
var recipe_list: VBoxContainer
var selected_recipe := "plank"
var recipe_name: Label
var ingredient_list: VBoxContainer
var craft_button: Button
var recipe_status: Label

func make_style(color: Color, border: Color = Color.TRANSPARENT) -> StyleBoxFlat:
    var style := StyleBoxFlat.new()
    style.bg_color = color
    style.border_color = border
    style.set_border_width_all(1)
    style.set_corner_radius_all(10)
    style.set_content_margin_all(10)
    return style

func _ready() -> void:
    layer = 10
    var root := Control.new()
    add_child(root)
    root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    root.mouse_filter = Control.MOUSE_FILTER_IGNORE
    hotbar_text = Label.new()
    hotbar_text.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
    hotbar_text.position = Vector2(-235, -55)
    hotbar_text.add_theme_font_size_override("font_size", 19)
    root.add_child(hotbar_text)
    panel = PanelContainer.new()
    panel.set_anchors_preset(Control.PRESET_CENTER)
    panel.position = Vector2(-490, -320)
    panel.custom_minimum_size = Vector2(980, 640)
    panel.add_theme_stylebox_override("panel", make_style(Color(0.065, 0.082, 0.085, 0.98), Color(0.3, 0.42, 0.38)))
    root.add_child(panel)
    var layout := VBoxContainer.new()
    layout.add_theme_constant_override("separation", 12)
    panel.add_child(layout)
    var title := Label.new()
    title.text = "РЮКЗАК  /  МАСТЕРСКАЯ                                  I — закрыть"
    title.add_theme_font_size_override("font_size", 25)
    layout.add_child(title)
    var columns := HBoxContainer.new()
    columns.add_theme_constant_override("separation", 14)
    columns.size_flags_vertical = Control.SIZE_EXPAND_FILL
    layout.add_child(columns)
    var bag := VBoxContainer.new()
    bag.custom_minimum_size.x = 360
    columns.add_child(bag)
    var bag_title := Label.new()
    bag_title.text = "ПРЕДМЕТЫ  •  В РЮКЗАКЕ"
    bag_title.add_theme_font_size_override("font_size", 18)
    bag.add_child(bag_title)
    var slots := GridContainer.new()
    slots.columns = 3
    slots.add_theme_constant_override("h_separation", 7)
    slots.add_theme_constant_override("v_separation", 7)
    bag.add_child(slots)
    for kind in ITEMS:
        var tile := PanelContainer.new()
        tile.custom_minimum_size = Vector2(112, 112)
        tile.add_theme_stylebox_override("panel", make_style(Color(0.13, 0.17, 0.17), Color(0.22, 0.31, 0.29)))
        slots.add_child(tile)
        var stack := VBoxContainer.new()
        tile.add_child(stack)
        var symbol := Label.new()
        symbol.text = ITEMS[kind][1]
        symbol.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
        symbol.add_theme_font_size_override("font_size", 29)
        stack.add_child(symbol)
        var caption := Label.new()
        caption.text = ITEMS[kind][0]
        caption.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
        caption.add_theme_font_size_override("font_size", 12)
        stack.add_child(caption)
        var amount := Label.new()
        amount.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
        amount.add_theme_font_size_override("font_size", 20)
        stack.add_child(amount)
        item_labels[kind] = amount
        item_slots[kind] = tile
    var catalog := VBoxContainer.new()
    catalog.custom_minimum_size.x = 205
    columns.add_child(catalog)
    var catalog_title := Label.new()
    catalog_title.text = "РЕЦЕПТЫ"
    catalog_title.add_theme_font_size_override("font_size", 18)
    catalog.add_child(catalog_title)
    recipe_list = VBoxContainer.new()
    recipe_list.add_theme_constant_override("separation", 8)
    catalog.add_child(recipe_list)
    for kind in RECIPES:
        var button := Button.new()
        button.custom_minimum_size = Vector2(195, 62)
        button.pressed.connect(select_recipe.bind(kind))
        recipe_list.add_child(button)
        recipe_buttons[kind] = button
    var details := VBoxContainer.new()
    details.custom_minimum_size.x = 320
    details.size_flags_horizontal = Control.SIZE_EXPAND_FILL
    columns.add_child(details)
    var detail_title := Label.new()
    detail_title.text = "ИЗГОТОВЛЕНИЕ"
    detail_title.add_theme_font_size_override("font_size", 18)
    details.add_child(detail_title)
    recipe_name = Label.new()
    recipe_name.add_theme_font_size_override("font_size", 23)
    details.add_child(recipe_name)
    var separator := HSeparator.new()
    details.add_child(separator)
    var needs := Label.new()
    needs.text = "ТРЕБУЕТСЯ  /  ЕСТЬ В РЮКЗАКЕ"
    details.add_child(needs)
    ingredient_list = VBoxContainer.new()
    ingredient_list.add_theme_constant_override("separation", 8)
    details.add_child(ingredient_list)
    craft_button = Button.new()
    craft_button.custom_minimum_size.y = 56
    craft_button.pressed.connect(func() -> void: craft_requested.emit(selected_recipe))
    details.add_child(craft_button)
    recipe_status = Label.new()
    details.add_child(recipe_status)
    var use_heading := Label.new()
    use_heading.text = "БЫСТРОЕ ИСПОЛЬЗОВАНИЕ"
    details.add_child(use_heading)
    for kind in ["berries", "bandage"]:
        var button := Button.new()
        button.custom_minimum_size.y = 43
        button.pressed.connect(_consume.bind(kind))
        details.add_child(button)
        use_buttons[kind] = button
    var footer := Label.new()
    footer.text = "Выбери рецепт → проверь ресурсы → нажми «Создать»"
    layout.add_child(footer)
    panel.visible = false
    refresh()

func _consume(kind: String) -> void:
    consumable_requested.emit(kind)

func select_recipe(kind: String) -> void:
    selected_recipe = kind
    refresh()

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
    hotbar_text.text = "[1] ТОПОР%s      [2] КИРКА%s      [I] РЮКЗАК" % [" ◀" if current_tool == "axe" else "", " ◀" if current_tool == "pickaxe" else ""]
    for kind in item_labels:
        var count: int = int(inventory.get(kind, 0))
        var amount: Label = item_labels[kind]
        amount.text = "× %d" % count
        var tile: PanelContainer = item_slots[kind]
        tile.modulate = Color.WHITE if count > 0 else Color(0.57, 0.63, 0.62)
    for recipe in RECIPES:
        var info: Array = RECIPES[recipe]
        var button: Button = recipe_buttons[recipe]
        button.text = "%s  %s" % ["●" if recipe == selected_recipe else "○", info[0]]
        button.modulate = Color(0.55, 0.93, 0.70) if recipe == selected_recipe else Color.WHITE
    for child in ingredient_list.get_children():
        child.queue_free()
    var info: Array = RECIPES[selected_recipe]
    recipe_name.text = info[0]
    var costs: Dictionary = info[1]
    var enough := true
    for material in costs:
        var required: int = int(costs[material])
        var available: int = int(inventory.get(material, 0))
        var good: bool = available >= required
        enough = enough and good
        var row := PanelContainer.new()
        row.add_theme_stylebox_override("panel", make_style(Color(0.12, 0.17, 0.16)))
        ingredient_list.add_child(row)
        var label := Label.new()
        label.text = "%s  %s\nНужно: %d     Есть: %d" % [ITEMS[material][1], ITEMS[material][0], required, available]
        label.add_theme_color_override("font_color", Color(0.52, 0.95, 0.62) if good else Color(1.0, 0.48, 0.43))
        row.add_child(label)
    craft_button.text = "СОЗДАТЬ" if enough else "НЕДОСТАТОЧНО РЕСУРСОВ"
    craft_button.disabled = not enough
    recipe_status.text = "Все материалы собраны" if enough else "Красным отмечены недостающие материалы"
    use_buttons["berries"].text = "Съесть ягоды  (+25 сытости)"
    use_buttons["berries"].disabled = int(inventory.get("berries", 0)) <= 0
    use_buttons["bandage"].text = "Использовать бинт  (+35 здоровья)"
    use_buttons["bandage"].disabled = int(inventory.get("bandage", 0)) <= 0
