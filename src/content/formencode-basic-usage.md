---
date: 2009-02-20
title: Basic Formencode usage pattern
tags: python
---

Here's a useful Python snippet that shows the basics of using [Formencode](http://www.formencode.org/) to validate form submissions inside a typical web-application controller. There's a reusable pattern here that isn't totally clear from the official documentation. This is non-framework code. First, here's the setup (the definition part):

```python
from formencode import Schema, validators

## Declarative style for schemas
class MyForm(Schema):
    name = validators.String(not_empty=True)
    email = validators.Email(resolve_domain=False)
    month = validators.Int(not_empty=True)
    allow_extra_fields = True

## Adding to schemas after the fact
MyForm.fields['address'] = validators.String(not_empty=True)

```

Now, here's what goes in your request handler, adapted as necessary to the particularities of your web application framework or architecture (i.e. the arguments passed to the request handler and the way of getting at POST arguments will be different depending on how your application is set up):

```python
from formencode import Invalid, htmlfill

def your_request_handler(request):
    errors = {}
    data = {}
    # Put data access common to GET/POST requests here
    if request.method == 'POST':
        data = dict(request.POST)
        try:
            data = MyForm().to_python(data)
            # Put use of the data here
            # Put a redirect to a GET-based confirmation page here
        except Invalid, e:
            errors = e.unpack_errors()
    else:
        pass # Put code for GET requests here
    html = your_template()
    print htmlfill.render(html, data, errors)

```

The control flow works like this. If there's no post data, then `data` and `errors` will both be empty, and your template will be rendered with an empty form. If there's post data but it's in error, the errors will be displayed and the posted data will be pre-filled into the form for the user. And if the data validates, you should return a redirect to a GET-based page after data processing is complete.
