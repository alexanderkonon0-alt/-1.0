"""
Backend API Tests for Rare Shot Live Wallpaper
Tests: Root endpoint, Status endpoints, Google Photos endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

class TestRootEndpoint:
    """Test root API endpoint"""
    
    def test_root_endpoint(self):
        """Test GET /api/ returns welcome message"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Rare Shot" in data["message"]
        print(f"✓ Root endpoint working: {data['message']}")


class TestStatusEndpoints:
    """Test status check endpoints"""
    
    def test_create_status_check(self):
        """Test POST /api/status creates status check"""
        payload = {"client_name": "test_client_pytest"}
        response = requests.post(f"{BASE_URL}/api/status", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert data["client_name"] == "test_client_pytest"
        assert "timestamp" in data
        print(f"✓ Status check created: {data['id']}")
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/status")
        assert get_response.status_code == 200
        all_checks = get_response.json()
        assert any(check["client_name"] == "test_client_pytest" for check in all_checks)
        print(f"✓ Status check persisted in database")
    
    def test_get_status_checks(self):
        """Test GET /api/status returns list of status checks"""
        response = requests.get(f"{BASE_URL}/api/status")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Status checks retrieved: {len(data)} total")


class TestGooglePhotosEndpoint:
    """Test Google Photos scraping endpoint"""
    
    def test_google_photos_with_valid_url(self):
        """Test GET /api/google-photos with valid album URL"""
        album_url = "https://photos.app.goo.gl/E8frgv5QyePtvHZr5"
        response = requests.get(
            f"{BASE_URL}/api/google-photos",
            params={"album_url": album_url},
            timeout=20
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Should return at least one photo"
        
        # Validate photo structure
        photo = data[0]
        assert "url" in photo
        assert "thumbnail" in photo
        assert "name" in photo
        assert "lh3.googleusercontent.com" in photo["url"]
        assert "lh3.googleusercontent.com" in photo["thumbnail"]
        print(f"✓ Google Photos API working: {len(data)} photos found")
        print(f"  Sample photo: {photo['name']}")
    
    def test_google_photos_missing_param(self):
        """Test GET /api/google-photos without album_url param"""
        response = requests.get(f"{BASE_URL}/api/google-photos")
        assert response.status_code == 422  # Validation error
        print(f"✓ Google Photos API validates required params")


@pytest.fixture(scope="session", autouse=True)
def check_backend_url():
    """Verify backend URL is set"""
    if not BASE_URL:
        pytest.fail("EXPO_PUBLIC_BACKEND_URL environment variable not set")
    print(f"\n=== Testing Backend API at: {BASE_URL} ===\n")
