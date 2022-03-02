# Dev Notes

## Resources and Items

* Resources wraps ListManager, which provides most the functionality. The Resource class adds the notion of item and resource names and the production of Items (rather than just objects).
* The resource and item configuration (names, class, key field, id normalizer, etc.) are captured at the resource level and passed to the item class constructor.
* Item creation options:
  * template is stored in the concrete Item class (e.g., StaffMember).
  * are used in the concrete resource for:
    * use in constructor (e.g., friendly error messages).
    * used in creating items.
  * the template overrides incoming options at the resource level; so you cannot change the 'itemClass' for instance.
  * at the item level, incoming options override the template. This is necessary to allow the resource class to set
    additional options which may appear in, but are null in the template. It is also necessary for sub-classes to
    override the parent class.
* Items are implemented using Proxy, which creates implicit getters based on the 'data' object. This ensures that copies are made as appropriate.
