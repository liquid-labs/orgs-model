# Dev Notes

## Resources and Items

* Resources wraps ListManager, which provides most the functionality. The Resource class adds the notion of item and resource names and the production of Items (rather than just objects).
* The resource and item configuration (names, class, key field, id normalizer, etc.) are captured at the resource level and passed to the item class constructor.
* Items trust they are getting the proper options and don't do further checking or overrides themselves.
* Items are implemented using Proxy, which creates implicit getters based on the 'data' object. This ensures that copies are made as appropriate.
