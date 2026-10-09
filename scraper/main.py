import requests

url = "https://collins-cmc.cafebonappetit.com/cafe/collins/"
response = requests.get(url, timeout=10)
print(response.status_code)
print(response.text[:500])