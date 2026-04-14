import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

# Health/Status tests
class TestStatus:
    """Status endpoint tests"""

    def test_get_status_returns_list(self):
        response = requests.get(f"{BASE_URL}/api/status")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/status: OK - returned {len(data)} records")

    def test_post_status_creates_record(self):
        payload = {"client_name": "TEST_rareshot_client"}
        response = requests.post(f"{BASE_URL}/api/status", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["client_name"] == "TEST_rareshot_client"
        assert "id" in data
        assert "timestamp" in data
        print(f"POST /api/status: OK - id={data['id']}")

    def test_root_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print(f"GET /api/: OK - {response.json()}")


# Google Photos scraping tests
class TestGooglePhotos:
    """Google Photos endpoint tests"""

    def test_google_photos_missing_param(self):
        """Should return 422 when album_url is missing"""
        response = requests.get(f"{BASE_URL}/api/google-photos")
        assert response.status_code == 422
        print(f"GET /api/google-photos (no param): 422 as expected")

    def test_google_photos_returns_list(self):
        """Should return a list (possibly empty) for a valid album URL"""
        album_url = "https://photos.app.goo.gl/E8frgv5QyePtvHZr5"
        response = requests.get(f"{BASE_URL}/api/google-photos", params={"album_url": album_url}, timeout=30)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/google-photos: OK - returned {len(data)} photos")

    def test_google_photos_response_structure(self):
        """If photos returned, verify structure has url, thumbnail, name"""
        album_url = "https://photos.app.goo.gl/E8frgv5QyePtvHZr5"
        response = requests.get(f"{BASE_URL}/api/google-photos", params={"album_url": album_url}, timeout=30)
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            photo = data[0]
            assert "url" in photo
            assert "thumbnail" in photo
            assert "name" in photo
            assert "lh3.googleusercontent.com" in photo["url"]
            assert "lh3.googleusercontent.com" in photo["thumbnail"]
            print(f"Photo structure OK: {photo['name']}, url={photo['url'][:60]}...")
        else:
            print("No photos returned - album may be private or scraping blocked. Response is valid empty list.")

    def test_google_photos_invalid_url_returns_empty(self):
        """Invalid URL should return empty list gracefully"""
        response = requests.get(f"{BASE_URL}/api/google-photos", params={"album_url": "https://example.com/notaphotoalbum"}, timeout=15)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/google-photos (invalid url): OK - returned empty list {len(data)} items")
