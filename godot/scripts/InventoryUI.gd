extends CanvasLayer

const UI = preload("res://scripts/UIDesign.gd")
const ICON_DIR := "res://assets/icons/"
const SLOT = preload("res://scripts/InventorySlot.gd")

signal craft_requested(recipe: String, quantity: int)
signal consumable_requested(kind: String)
signal tool_selected(kind: String)

const ITEMS := {
    "wood": ["Древесина", "🌲"],
    "stone": ["Камень", "🪨"],
    "iron": ["Железная руда", "⛏"],
    "coal": ["Уголь", "⬛"],
    "iron_bar": ["Железный слиток", "🔩"],
    "berries": ["Ягоды", "🍓"],
    "bandage": ["Бинт", "✚"]
}
const RECIPES := {
    "axe": ["Топор", {"wood": 10, "stone": 5}],
    "pickaxe": ["Кирка", {"wood": 5, "stone": 10}],
    "iron_bar": ["Железный слиток", {"iron": 3, "coal": 2}],
    "bandage": ["Бинт", {"berries": 3, "wood": 2}]
}
var inventory: Dictionary = {}
var tools: Dictionary = {}
var current_tool := "axe"
var panel: PanelContainer
var hotbar_text: Label
var hotbar_buttons: Dictionary = {}
var hotbar_assignments: Array[String] = ["axe", "pickaxe", "berries", "bandage", "", ""]
var hotbar_slots: Array = []
var item_labels: Dictionary = {}
var item_slots: Dictionary = {}
var recipe_buttons: Dictionary = {}
var use_buttons: Dictionary = {}
var recipe_list: VBoxContainer
var selected_recipe := "axe"
var quantity_input: SpinBox
var max_button: Button
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
    var hotbar := HBoxContainer.new()
    hotbar.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
    hotbar.position = Vector2(-150, -88)
    hotbar.add_theme_constant_override("separation", 10)
    root.add_child(hotbar)
    for index in range(6):
        var slot = SLOT.new()
        slot.custom_minimum_size = Vector2(92, 94)
        slot.slot_index = index
        slot.draggable = true
        slot.item_dropped.connect(assign_hotbar)
        slot.slot_pressed.connect(activate_slot)
        hotbar.add_child(slot)
        hotbar_slots.append(slot)
    hotbar_text = Label.new()
    hotbar_text.visible = false
    root.add_child(hotbar_text)
    panel = PanelContainer.new()
    panel.set_anchors_preset(Control.PRESET_CENTER)
    panel.position = Vector2(-490, -320)
    panel.custom_minimum_size = Vector2(980, 640)
    panel.add_theme_stylebox_override("panel", UI.panel_style())
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
        var tile = SLOT.new()
        tile.custom_minimum_size = Vector2(112, 112)
        tile.draggable = true
        tile.slot_pressed.connect(activate_slot)
        slots.add_child(tile)
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
        UI.decorate_button(button)
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
    quantity_input = SpinBox.new()
    quantity_input.min_value = 1
    quantity_input.max_value = 9999
    quantity_input.value = 1
    quantity_input.rounded = true
    quantity_input.value_changed.connect(func(_v: float) -> void: refresh())
    details.add_child(quantity_input)
    max_button = Button.new()
    max_button.text = "МАКС"
    max_button.pressed.connect(set_max_quantity)
    UI.decorate_button(max_button)
    details.add_child(max_button)
    craft_button = Button.new()
    craft_button.custom_minimum_size.y = 56
    craft_button.pressed.connect(func() -> void: craft_requested.emit(selected_recipe, int(quantity_input.value)))
    UI.decorate_button(craft_button, true)
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
        UI.decorate_button(button)
        details.add_child(button)
        use_buttons[kind] = button
    var footer := Label.new()
    footer.text = "Выбери рецепт → проверь ресурсы → нажми «Создать»"
    layout.add_child(footer)
    UI.decorate_title(title, 26)
    UI.decorate_title(bag_title, 18)
    UI.decorate_title(catalog_title, 18)
    UI.decorate_title(detail_title, 18)
    panel.visible = false
    refresh()

func item_name(kind: String) -> String:
    if kind in ITEMS:
        return str(ITEMS[kind][0])
    if kind == "axe":
        return "Топор"
    if kind == "pickaxe":
        return "Кирка"
    return "Пусто"

func item_count(kind: String) -> int:
    if kind == "":
        return 0
    if kind in ["axe", "pickaxe"]:
        return 1 if bool(tools.get(kind, false)) else 0
    return int(inventory.get(kind, 0))

func assign_hotbar(kind: String, index: int) -> void:
    if index < 0 or index >= hotbar_assignments.size() or item_count(kind) <= 0:
        return
    var existing := hotbar_assignments.find(kind)
    if existing == index:
        return
    if existing >= 0:
        hotbar_assignments[existing] = hotbar_assignments[index]
    hotbar_assignments[index] = kind
    refresh()

func activate_slot(kind: String) -> void:
    if item_count(kind) <= 0:
        return
    if kind in ["axe", "pickaxe"]:
        tool_selected.emit(kind)
    elif kind in ["berries", "bandage"]:
        consumable_requested.emit(kind)

func activate_hotbar_index(index: int) -> void:
    if index >= 0 and index < hotbar_assignments.size():
        activate_slot(hotbar_assignments[index])

func get_hotbar_assignments() -> Array:
    return hotbar_assignments.duplicate()

func restore_hotbar_assignments(saved: Array) -> void:
    if saved.size() != 6:
        return
    var next: Array[String] = []
    for kind in saved:
        var item := str(kind)
        if item != "" and item not in ITEMS and item not in ["axe", "pickaxe"]:
            return
        if item != "" and item in next:
            return
        next.append(item)
    hotbar_assignments = next
    refresh()

func _select_tool(kind: String) -> void:
    tool_selected.emit(kind)

func _consume(kind: String) -> void:
    consumable_requested.emit(kind)

func select_recipe(kind: String) -> void:
    selected_recipe = kind
    quantity_input.value = 1
    refresh()

func max_craft_count() -> int:
    if selected_recipe in ["axe", "pickaxe"] and bool(tools.get(selected_recipe, false)):
        return 0
    var costs: Dictionary = RECIPES[selected_recipe][1]
    var maximum := 9999
    for material in costs:
        maximum = mini(maximum, int(floor(float(inventory.get(material, 0)) / float(costs[material]))))
    return mini(1, maxi(0, maximum)) if selected_recipe in ["axe", "pickaxe"] else maxi(0, maximum)

func set_max_quantity() -> void:
    quantity_input.value = maxi(1, max_craft_count())
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
    for index in range(hotbar_slots.size()):
        var kind: String = hotbar_assignments[index]
        var amount: int = item_count(kind)
        var title := str(index + 1) + " · " + item_name(kind)
        hotbar_slots[index].update_item(kind, amount, title)
        hotbar_slots[index].add_theme_stylebox_override("panel", UI.panel_style(kind == current_tool and kind != ""))
    for kind in item_slots:
        var tile = item_slots[kind]
        tile.update_item(kind, item_count(kind), item_name(kind))
    for recipe in RECIPES:
        var info: Array = RECIPES[recipe]
        var button: Button = recipe_buttons[recipe]
        button.text = "%s  %s" % ["●" if recipe == selected_recipe else "○", info[0]]
        button.icon = load(ICON_DIR + str(recipe) + ".svg") as Texture2D
        button.expand_icon = true
        UI.decorate_button(button, recipe == selected_recipe)
    for child in ingredient_list.get_children():
        child.queue_free()
    var info: Array = RECIPES[selected_recipe]
    recipe_name.text = info[0]
    var costs: Dictionary = info[1]
    var enough := max_craft_count() >= int(quantity_input.value)
    for material in costs:
        var required: int = int(costs[material]) * int(quantity_input.value)
        var available: int = int(inventory.get(material, 0))
        var good: bool = available >= required
        enough = enough and good
        var row := PanelContainer.new()
        row.add_theme_stylebox_override("panel", UI.panel_style())
        ingredient_list.add_child(row)
        var contents := HBoxContainer.new()
        contents.add_theme_constant_override("separation", 8)
        row.add_child(contents)
        var ingredient_icon := TextureRect.new()
        ingredient_icon.texture = load(ICON_DIR + str(material) + ".svg") as Texture2D
        ingredient_icon.custom_minimum_size = Vector2(42, 42)
        ingredient_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
        ingredient_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
        contents.add_child(ingredient_icon)
        var label := Label.new()
        label.text = "%s\nНужно: %d     Есть: %d" % [ITEMS[material][0], required, available]
        label.add_theme_color_override("font_color", Color(0.52, 0.95, 0.62) if good else Color(1.0, 0.48, 0.43))
        contents.add_child(label)
    craft_button.text = ("СОЗДАТЬ ×%d" % int(quantity_input.value)) if enough else "НЕДОСТАТОЧНО РЕСУРСОВ"
    max_button.disabled = max_craft_count() <= 0
    craft_button.disabled = not enough
    recipe_status.text = ("Инструмент уже изготовлен" if selected_recipe in ["axe", "pickaxe"] and bool(tools.get(selected_recipe, false)) else ("Все материалы собраны" if enough else "Красным отмечены недостающие материалы"))
    use_buttons["berries"].text = "Съесть ягоды  (+25 сытости)"
    use_buttons["berries"].disabled = int(inventory.get("berries", 0)) <= 0
    use_buttons["bandage"].text = "Использовать бинт  (+35 здоровья)"
    use_buttons["bandage"].disabled = int(inventory.get("bandage", 0)) <= 0
