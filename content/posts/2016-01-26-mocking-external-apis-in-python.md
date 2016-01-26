---
title: "Mocking external APIs in Python"
date: 2016-01-26 23:40:25 +0000
categories:
- python
- tdd
- mock
comments: true
---

It's quite common to have to integrate an external API into your web app for some of your functionality. However, it's a really bad idea to have requests be sent to the remote API when running your tests. At best, it means your tests may fail due to unexpected circumstances, such as a network outage. At worst, you could wind up making requests to paid services that will cost you money, or sending push notifications to clients. It's therefore a good idea to mock these requests in some way, but it can be fiddly.

In this post I'll show you several ways you can mock an external API so as to prevent requests being sent when running your test suite. I'm sure there are many others, but these have worked for me recently.

Mocking the client library
--------------------------

Nowadays many third-party services realise that providing developers with client libraries in a variety of languages is a good idea, so it's quite common to find a library for interfacing with a third-party service. Under these circumstances, the library itself is usually already thoroughly tested, so there's no point in you writing additional tests for that functionality. Instead, you can just mock the client library so that the request is never sent, and if you need a response, then you can specify one that will remain constant.

I recently had to integrate Stripe with a mobile app backend, and I used their client library. I needed to ensure that I got the right result back. In this case I only needed to use the `Token` object's `create()` method. I therefore created a new `MockToken` class that inherited from `Token`, and overrode its `create()` method so that it only accepted one card number and returned a hard-coded response for it:

```python
from stripe.resource import Token, convert_to_stripe_object
from stripe.error import CardError


class MockToken(Token):

    @classmethod
    def create(cls, api_key=None, idempotency_key=None,
               stripe_account=None, **params):
        if params['card']['number'] != '4242424242424242':
            raise CardError('Invalid card number', None, 402)

        response = {
            "card": {
              "address_city": None,
              "address_country": None,
              "address_line1": None,
              "address_line1_check": None,
              "address_line2": None,
              "address_state": None,
              "address_zip": None,
              "address_zip_check": None,
              "brand": "Visa",
              "country": "US",
              "cvc_check": "unchecked",
              "dynamic_last4": None,
              "exp_month": 12,
              "exp_year": 2017,
              "fingerprint": "49gS1c4YhLaGEQbj",
              "funding": "credit",
              "id": "card_17XXdZGzvyST06Z022EiG1zt",
              "last4": "4242",
              "metadata": {},
              "name": None,
              "object": "card",
              "tokenization_method": None
          },
            "client_ip": "192.168.1.1",
            "created": 1453817861,
            "id": "tok_42XXdZGzvyST06Z0LA6h5gJp",
            "livemode": False,
            "object": "token",
            "type": "card",
            "used": False
        }
        return convert_to_stripe_object(response, api_key, stripe_account)
```

Much of this was lifted straight from the source code for the library. I then wrote a test for the payment endpoint and patched the `Token` class:

```python
class PaymentTest(TestCase):
    @mock.patch('stripe.Token', MockToken)
    def test_payments(self):
        data = {
            "number": '1111111111111111',
            "exp_month": 12,
            "exp_year": 2017,
            "cvc": '123'
        }
        response = self.client.post(reverse('payments'), data=data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
```

This replaced `stripe.Token` with `MockToken` so that in this test, the response from the client library was always going to be the expected one.

If the response doesn't matter and all you need to do is be sure that the right method would have been called, this is easier. You can just mock the method in question using `MagicMock` and assert that it has been called afterwards, as in this example:

```python
class ReminderTest(TestCase):
    def test_send_reminder(self):
        # Mock PushService.create_message()
        PushService.create_message = mock.MagicMock(name="create_message")

        # Call reminder task
        send_reminder()

        # Check user would have received a push notification
        PushService.create_message.assert_called_with([{'text': 'My push', 'conditions': ['UserID', 'EQ', 1]}])
```

Mocking lower-level requests
----------------------------

Sometimes, no client library is available, or it's not worth using one as you only have to make one or two requests. Under these circumstances, there are ways to mock the actual request to the external API. If you're using the `requests` module, then there's a `responses` module that's ideal for mocking the API request.

Suppose we have the following code:

```python
import json, requests

def send_request_to_api(data):
    # Put together the request
    params = {
        'auth': settings.AUTH_KEY,
        'data': data
    }
    response = requests.post(settings.API_URL, data={'params': json.dumps(params)})
    return response
```

Using `responses` we can mock the response from the server in our test:

```python
class APITest(TestCase):
    @responses.activate
    def test_send_request(self):
        # Mock the API
        responses.add(responses.POST,
            settings.API_URL,
            status=200,
            content_type="application/json",
            body='{"item_id": "12345678"}')

        # Call function
        data = {
            "surname": "Smith",
            "location": "London"
        }
        send_request_to_api(data)

        # Check request went to correct URL
        assert responses.calls[0].request.url == settings.API_URL
```

Note the use of the `@responses.activate` decorator. We use `responses.add()` to set up each URL we want to be able to mock, and pass through details of the response we want to return. We then make the request, and check that it was made as expected.

You can find more details of the `responses` module [here](https://github.com/getsentry/responses).

Summary
-------

I'm pretty certain that there are other ways you can mock an external API in Python, but these ones have worked for me recently. If you use another method, please feel free to share it in the comments.
