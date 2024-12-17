from django.urls import reverse


def test_django_admin_login(admin_user, client, live_server):
    response = client.get(reverse("admin:index"))

    # Make sure we are redirected to the django admin login page
    assert response.status_code == 302
    assert response.url.startswith(reverse("admin:login"))

    credentials = {"username": admin_user.email, "password": "password"}
    response = client.post(response.url, credentials)

    # We should be redirected to the django index
    assert response.status_code == 302
    assert response.url.startswith(reverse("admin:index"))

    # No last_login key has been set in the session as we do not
    # login via the regular /users/login page
    assert "last_login" not in client.session

    # And our logged in session will still be valid
    response = client.get(reverse("admin:index"))

    assert response.status_code == 200
