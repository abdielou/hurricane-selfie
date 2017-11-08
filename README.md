# Hurricane Selfie.

### Motivation
Since I live in Puerto Rico, I thought I should honor the hurricanes and do something related to them.

### Description
The service will try to find satellite imagery (selfies?) of the specified hurricane in the query parameters.

### How it's done
1. A name (in caps) and year of a hurricane is given as input
1. The historical hurricane tracking data is fetched from : http://weather.unisys.com/
1. About 10 geo locations will be extracted along with it's date time. A 100-200 km geo area will be constructed from the center of each point.
1. A geo query will be made to SAT-API : https://api.developmentseed.org/satellites. This will filter out based on the date and a bounding geo fence based on the tracking information of the hurricane. (the request had to be limited and throttled due to restrictions)
1. The results will be filtered and flattened, and any available thumbnails will be returned.
1. Sorry, a ton of validation is missing. With more time it would be way more robust.

### Query Examples 
```
curl https://<yourInstance>.run.webtask.io/hurricane-selfie\?name=MARIA&year=2017

curl https://<yourInstance>.run.webtask.io/hurricane-selfie\?name=IRMA&year=2017
```

### Disclaimer
I really thought I would get spectacular views of hurricanes, but the reality is that the images are small tiles and all you see are clouds :(