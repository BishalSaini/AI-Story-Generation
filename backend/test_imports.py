try:
    from app.services.gemini_service import model
    print("Successfully imported gemini_service and initialized model.")
except Exception as e:
    print(f"Import failed: {e}")
    import traceback
    traceback.print_exc()
