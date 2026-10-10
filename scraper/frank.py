import requests
import json

url = "https://api.pomona.edu/eatec/Frank.json"
response = requests.get(url, timeout=10)
text = response.text
start = text.find("{")
end = text.rfind("}") #text is a jsonp file, json file is in between the {}

if start == -1 or end == -1 or end < start:
    raise ValueError(f"No JSON object found: {text[:200]!r}")

data = json.loads(text[start:end + 1])
menu = (data["EatecExchange"])["menu"]

#len(menu)=107 because the list menu has 107 elements as of 10/10/2026
#with each entry separated by location (they're separated for meals & day, but location is the lowest level)
#recipes: and recipe: are the same thing; they both separate by location

#one menu item to test parseItem
testItem = menu[0]["recipes"]["recipe"][0]

NUTRIENT_LABELS = (
    "Calories (kcal)~CAL|Total Lipid/Fat (g)~TL|Saturated fatty acid (g)~FAS|"
    "Trans Fat (g)~TRF|Cholesterol (mg)~CHO|Sodium (mg)~Na|Carbohydrate (g)~CRB|"
    "Total Dietary Fiber (g)~FIB|Total Sugars (g)~SUG|Added Sugar (g)~SugA|"
    "Protein (g)~PRO|Vitamin C (mg)~vC|Calcium (mg)~CA|Iron (mg)~Fe|"
    "Vitamin A (mcg RAE)~(rae)|Phosphorus (mg)~PHO|Potassium (mg)~K|Vitamin D(iu)~VITD"
)

#the output style of this function can be changed into anything, I felt that the description and nutrients deserved their separate dicts
#the structure is: (List of (Dict description) (Dict nutrients))
def parseItem(recipeDict):
    '''recipeDict is one of the elements from the line "recipe" : {...}
    each dict is a specific menu item'''
    recipe = recipeDict
 
    info = {
        "id": recipe["@id"],
        "category": recipe["@category"],
        "menuPosition": recipe["@menuPosition"],
        "description": recipe["@description"],
        "shortName": recipe["@shortName"],
        "servingDescription": recipe["@servingDescription"],
    }
 
    labels = [entry.split("~")[0] for entry in NUTRIENT_LABELS.split("|")]
    values = recipe["@nutrients"].split("|")
 
    nutrients = {}
    for i, label in enumerate(labels):
        if i < len(values) and values[i] != "NA":
            nutrients[label] = float(values[i])
        else:
            nutrients[label] = None
 
    return [info, nutrients]

#testing the first item in the json
#print(parseItem(testItem))

testLocation = menu[0]

#I will leave the parsers like this until we know which data types we want to return
#and if we decide on a database to store this data
#I will easily be able to iterate parseLocation over the ~100 locations across meals afterwards
def parseLocation(locationDict):
    '''Parses the menu items in one location of frank
    each element of the value of "menu": is a location
    returns a dict with id, name, servedate, location, meal, then goes into a list of the outputs of parseItem'''
    location = locationDict

    itemsFile = location["recipes"]["recipe"]
    returnItems = [parseItem(item) for item in itemsFile]


    info = {
        "id": location["@id"],
        "servedate": location["@servedate"],
        "location": location["@location"],
        "meal": location["@mealperiodname"],
        "items": returnItems
    }
    return info

#testing the first location in the json
#print(parseLocation(testLocation))