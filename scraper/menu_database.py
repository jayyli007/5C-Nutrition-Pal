def to_number(value) -> int | float | None:
    if value is None:
        return None
    
    if isinstance(value, int) or isinstance(value, float):
        return value
    
    characters = value.replace(" ", "")
    is_float = False

    if characters.startswith(("<", "lessthan")):
        return 0
    
    characters = list(characters)


    for i in range(len(characters)-1, -1, -1):
        try:
            int(characters[i])

        except ValueError:
            if characters[i] == ".":
                is_float = True

            else:
                characters.pop(i)
    
    output = "".join(characters)

    try:
        if is_float:
            output = float(output)
        
        else:
            output = int(output)
    
    except ValueError:
        return None
    
    return output
    
    