


We provide a simple and functional API and you can download automatically the complete domain lists and updates. API is available on all tariff plans and there are no limits on the query number. For access to the API, please use a token available in your account after registration..



Get a file with a list of domains
API request: https://domains-monitor.com/api/v1/TOKEN/get/ZONE/list/FORMAT/

TOKEN - your access token
ZONE - zone (for example com, de, uk etc) or "full" if you need a complete list of all domains, "dailyupdate" for newly registered domains, "dailyupdate-detailed" for newly registered domains with IP and country information, "dailyemails" for newly domains + emails, "dailyremove" for newly removed domains, "malware" for a list of compromised domains. API support daily, weekly, monthly and quarterly lists. As well full detailed lists.
Complete list of possible values:

full, update OR 'specific domain zone',
dailyupdate, weeklyupdate, monthlyupdate, quarterlyupdate,
dailyremove, weeklyremove, monthlyremove, quarterlyremove,
dailyemails, weeklyemails, monthlyemails, quarterlyemails,
detailed, detailed-update, weeklyupdate-detailed, monthlyupdate-detailed, quarterlyupdate-detailed,
malware.
FORMAT - "zip"(without quotes) if you need compressed file, "text" if you need result in plain-text, "split" for a list domains divided by 10 million lines per file (files are combined into one archive, detailed lists are not supported).



Get a file with a full detailed list of domains
API request: https://domains-monitor.com/api/v1/TOKEN/get-detailed/ZONE/list/FORMAT/

TOKEN - your access token
ZONE - domain zone (for example com, de, uk etc) if you need detailed list for specific domains zone, zone-update (for example com-update, de-update, uk-update etc) - daily update of detailed list of domains for specific domain zone, "full" - full detailed list with all domain zones, "full-update" - daily update for all domain zones
FORMAT - "zip"(without quotes) if you need compressed file, "text" if you need result in plain-text(text format support only full and full-update requests).



Get a list of newly registered, removed and compromised domains
API request: https://domains-monitor.com/api/v1/TOKEN/TYPE/FORMAT/

TOKEN - your access token
TYPE - "dailyupdate" for a list of newly registered domains, "dailyupdate-detailed" for newly registered domains with IP and country information, "dailyemails" for a list of newly domains + E-mails, "dailyremove" for a list of newly removed domains, "malware" for a list of compromised domains. API support daily, weekly, monthly and quarterly lists. Complete list of possible values: dailyupdate, weeklyupdate, monthlyupdate, quarterlyupdate, dailyremove, weeklyremove, monthlyremove, quarterlyremove, dailyemails, weeklyemails, monthlyemails, quarterlyemails, dailyupdate-detailed, weeklyupdate-detailed, monthlyupdate-detailed, quarterlyupdate-detailed, malware
FORMAT - "xml" OR "json"



Search by all domain names
API request: https://domains-monitor.com/api/v1/TOKEN/search/ZONE/QUERY/FORMAT/

TOKEN - your access token
ZONE - the zone that will be searched (for example com, de, uk etc) OR "full" if you need a complete search
QUERY - the character set by you that are looking for, for example 'google' OR 'ikipedia' (without quotes)
FORMAT - "xml" OR "json"

The query should contain at least 3 characters.

For approximate search use API request https://domains-monitor.com/api/v1/TOKEN/aprx-search/ZONE/QUERY/FORMAT/.
The query should contain at least 3 characters. If the request is up to 9 characters, then will be found domains with 1 typo in the request. If request contains more than 9 characters - 2 typos. For example, an approximate search for 'facebook' will find not only the original domain facebook.com but also domains with 1 wrong character like fucebook.com,fcebook.com, thefaceb0ok.com and so on.

A query returns no more than 100,000 results. No more than 100 search queries per hour. PRO account is required.



Get a list of zones
API request: https://domains-monitor.com/api/v1/TOKEN/zones/FORMAT/

TOKEN - your access token
FORMAT - "xml" OR "json"



Get a list of websites with certain technologies
API request: https://domains-monitor.com/api/v1/TOKEN/technology/QUERY/list/FORMAT/

TOKEN - your access token
QUERY - name of technology (for example drupal, drupal_daily, facebook, facebook_daily). Full list available here or with API call below.
FORMAT - "zip" OR "text"



Get a list of technologies
API request: https://domains-monitor.com/api/v1/TOKEN/technology-list/FORMAT/

TOKEN - your access token
FORMAT - "xml" OR "json"



Get a file with a list of DNS TXT records
API request: https://domains-monitor.com/api/v1/TOKEN/dnstxt/QUERY/list/FORMAT/

TOKEN - your access token
QUERY - "full" OR "dailyupdate". full - TXT DNS records for all existing domains; dailyupdate - TXT DNS records for newly registered domains only(last day); weeklydnstxtrecords - last week; monthlydnstxtrecords - last month; quarterlydnstxtrecords - last 3 months
FORMAT - "zip" OR "text"



Get a file with a list of MX DNS records
API request: https://domains-monitor.com/api/v1/TOKEN/mx/QUERY/list/FORMAT/

TOKEN - your access token
QUERY - "full" OR "dailyupdate". full - MX DNS records for all existing domains; dailyupdate - MX DNS records for newly registered domains only(last day);
FORMAT - "zip" OR "text"



Get an information from Monitor
API request: https://domains-monitor.com/api/v1/TOKEN/monitor/FORMAT/

TOKEN - your access token
FORMAT - "xml" OR "json"



Get an list of available historical domain lists (full list of domains, daily updates)
API request: https://domains-monitor.com/api/v1/TOKEN/historical-list/FORMAT/

TOKEN - your access token
FORMAT - "xml" OR "json"
Call will return a json/xml with information what type of datasets available for what date. Please use received type and date in call below.



Get a file with a historical domains
API request: https://domains-monitor.com/api/v1/TOKEN/historical/TYPE/DATE/

TOKEN - your access token
TYPE - domains, detailed, dailyupdate, dailyemails or dailyremove
DATE - dd.mm.yyyy
Please use type and date from call above.



Get an account details
API request: https://domains-monitor.com/api/v1/TOKEN/account/FORMAT/

TOKEN - your access token
FORMAT - "xml" OR "json"






© DM 2017 - 2026             Zones     Detailed lists     Technologies     Search     Monitor     Historical     Google Analytics IDs     DNS TXT     Blog     Free lists     Price     FAQ     API     Migration     Terms & Privacy     Contacts