import pandas as pd
import requests, json
from os import path

TIMES = ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00']
ISO_DATE_FORMAT = '%Y-%m-%d'

cwd = path.dirname(__file__)
data_dir = path.join(cwd, 'leeds')

with open(path.join(cwd, 'index-footfall.json'), 'r') as fp:
  index = json.load(fp)

response = requests.get('https://datamillnorth.org/api/action/package_show?id=leeds-city-centre-footfall-data')
package = response.json()

resources = pd.DataFrame(package['result']['resources'])
resources.created = resources.created.str[:10]  #strip time section from datetime as we only need date
resources.created = pd.to_datetime(resources.created, format=ISO_DATE_FORMAT)

for k,v in index.items():
  idx = k[-1] # last character of key is the index number
  if idx == '5' or idx == '8':  #counters 5 and 8 are no longer used so we'll skip those.
    continue

  filename = path.join(data_dir, f'footfall-{idx}-1.csv')
  existing = pd.read_csv(filename)
  existing.Date = pd.to_datetime(existing.Date, format=ISO_DATE_FORMAT)

  last_date = existing.tail(n=1).Date.values[0]
  new_resources = resources[resources.created > last_date]

  for i, row in new_resources.iterrows():
    url = row.url
    new_data = pd.read_csv(url)

    #cleanup data a bit
    new_data.Date = pd.to_datetime(new_data.Date, format='%d-%b-%y')
    new_data.LocationName = new_data.LocationName.str.strip()
    new_data.LocationName = new_data.LocationName.str.lower()

    # check dates don't overlap
    new_data_first_row = new_data.head(n=1)
    existing_data_last_row = existing.tail(n=1)
    last_date = existing_data_last_row.Date
    if new_data_first_row.Date.values[0] < existing_data_last_row.Date.values[0]:
      continue

    sitename = v['desc'].strip()
    sitename = sitename.lower()
    
    site_data = new_data[new_data.LocationName == sitename]
    for date in site_data.Date.unique():
      by_date = site_data[site_data.Date == date]
      new_row = {'Date': date}
      for time in TIMES:
        by_time = by_date[by_date.Hour == time]
        new_row[time] = by_time.ReportCount.values[0]
      existing = pd.concat([existing,pd.DataFrame(new_row,[0])], ignore_index=True)
  existing.sort_values(by='Date', inplace=True)
  existing.to_csv(filename, index=False, date_format=ISO_DATE_FORMAT)
new_last_date = existing.tail(n=1).Date.values[0]
print(str(new_last_date)[:10])