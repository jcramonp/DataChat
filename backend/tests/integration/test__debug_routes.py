# backend/tests/integration/test__debug_routes.py
# No hace assertions fuertes: imprime rutas para ayudarte a configurar.
def test__debug_print_routes(list_paths):
    print("\n[DEBUG] Rutas disponibles:")
    for p in list_paths():
        print("   ", p)
    assert True
