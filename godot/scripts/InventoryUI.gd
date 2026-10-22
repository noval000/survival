extends CanvasLayer

signal craft_requested(recipe: String)
signal tool_selected(tool: String)
signal consumable_requested(kind: String)

var inventory: Dictionary = {"wood": 0, "stone": 0, "plank": 0, "iron": 0, "coal": 0, "iron_bar": 0, "berries": 0, "bandage": 0}
var tools: Dictionary = {"axe": true, "pickaxe": true}
var current_tool: String = "axe"
var panel: PanelContainer
var resource_text: Label
var hint_text: Label
var hotbar_text: Label
var recipe_buttons: Dictionary = {}

func _ready() -> void:
    layer = 10
    var root := Control.new()
    root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    root.mouse_filter = Control.MOUSE_FILTER_IGNORE
    add_child(root)
    hotbar_text = Label.new()
    hotbar_text.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
    hotbar_text.position = Vector2(-230, -65)
    hotbar_text.add_theme_font_size_override("font_size", 19)
    root.add_child(hotbar_text)
    panel = PanelContainer.new()
    panel.set_anchors_preset(Control.PRESET_CENTER)
    panel.position = Vector2(-255, -200)
    panel.custom_minimum_size = Vector2(510, 400)
    root.add_child(panel)
    var content := VBoxContainer.new()
    content.add_theme_constant_override("separation", 12)
    panel.add_child(content)
    var title := Label.new()
    title.text = "INVENTORY  |  I to close"
    title.add_theme_font_size_override("font_size", 24)
    content.add_child(title)
    resource_text = Label.new()
    content.add_child(resource_text)
    var divider := HSeparator.new()
    content.add_child(divider)
    var recipes := Label.new()
    recipes.text = "CRAFTING"
    recipes.add_theme_font_size_override("font_size", 20)
    content.add_child(recipes)
    for recipe in ["plank", "axe", "pickaxe", "iron_bar", "bandage"]:
        var button := Button.new()
        button.pressed.connect(_on_craft.bind(recipe))
        recipe_buttons[recipe] = button
        content.add_child(button)
    for kind in ["berries", "bandage"]:
        var consume := Button.new()
        consume.name = "Consume_" + kind
        consume.pressed.connect(func() -> void: consumable_requested.emit(kind))
        content.add_child(consume)
    hint_text = Label.new()
    hint_text.text = "1 Axe  |  2 Pickaxe  |  LMB Harvest"
    content.add_child(hint_text)
    panel.visible = false
    refresh()

func _on_craft(recipe: String) -> void:
    craft_requested.emit(recipe)

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
    hotbar_text.text = "[1] AXE%s     [2] PICKAXE%s     [I] INVENTORY" % [" *" if current_tool == "axe" else "", " *" if current_tool == "pickaxe" else ""]
    if resource_text == null:
        return
    resource_text.text = "Wood: %d   Stone: %d   Planks: %d\nIron: %d   Coal: %d   Iron bars: %d" % [int(inventory.get("wood", 0)), int(inventory.get("stone", 0)), int(inventory.get("plank", 0)), int(inventory.get("iron", 0)), int(inventory.get("coal", 0)), int(inventory.get("iron_bar", 0))]
    resource_text.text += "\nBerries: %d   Bandages: %d" % [int(inventory.get("berries", 0)), int(inventory.get("bandage", 0))]
    var berry_button: Button = resource_text.get_parent().get_node("Consume_berries")
    berry_button.text = "Eat berries (+25 hunger)  [%d]" % int(inventory.get("berries", 0))
    berry_button.disabled = int(inventory.get("berries", 0)) <= 0
    var bandage_use: Button = resource_text.get_parent().get_node("Consume_bandage")
    bandage_use.text = "Use bandage (+35 health)  [%d]" % int(inventory.get("bandage", 0))
    bandage_use.disabled = int(inventory.get("bandage", 0)) <= 0
    var craft_bandage: Button = recipe_buttons["bandage"]
    craft_bandage.text = "Craft bandage (3 berries, 2 planks)"
    craft_bandage.disabled = int(inventory.get("berries", 0)) < 3 or int(inventory.get("plank", 0)) < 2
    var smelt_button: Button = recipe_buttons["iron_bar"]
    smelt_button.text = "Smelt iron bar  (3 iron, 2 coal)"
    smelt_button.disabled = int(inventory.get("iron", 0)) < 3 or int(inventory.get("coal", 0)) < 2
    var plank_button: Button = recipe_buttons["plank"]
    plank_button.text = "Make 2 planks  (5 wood)"
    plank_button.disabled = int(inventory.get("wood", 0)) < 5
    var axe_button: Button = recipe_buttons["axe"]
    axe_button.text = "Craft axe  (10 wood, 5 stone)"
    axe_button.disabled = int(inventory.get("wood", 0)) < 10 or int(inventory.get("stone", 0)) < 5
    var pick_button: Button = recipe_buttons["pickaxe"]
    pick_button.text = "Craft pickaxe  (5 wood, 10 stone)"
    pick_button.disabled = int(inventory.get("wood", 0)) < 5 or int(inventory.get("stone", 0)) < 10
