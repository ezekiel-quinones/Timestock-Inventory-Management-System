import unittest
import sys
from types import ModuleType, SimpleNamespace
from unittest.mock import patch

import duckdb
from fastapi import HTTPException

# Keep this test process away from the live DuckDB file (which may be locked by Uvicorn).
db_module = ModuleType("backend.db_connection")
db_module.DB_PATH = ":memory:"
db_module.con = duckdb.connect(":memory:")
with patch.dict(sys.modules, {"backend.db_connection": db_module}):
    from backend import database
    from backend.api import delete_material, delete_order_route, delete_product


class InspectableConnection:
    def __init__(self, connection):
        self.connection = connection
        self.closed = False

    def execute(self, *args):
        return self.connection.execute(*args)

    def executemany(self, *args):
        return self.connection.executemany(*args)

    def close(self):
        self.closed = True


class DeleteOrderTests(unittest.TestCase):
    def setUp(self):
        self.connection = duckdb.connect(":memory:")
        self.connection.execute("CREATE TABLE order_transactions (id VARCHAR PRIMARY KEY)")
        self.connection.execute(
            "CREATE TABLE order_items (order_id VARCHAR REFERENCES order_transactions(id))"
        )
        self.connection.execute("INSERT INTO order_transactions VALUES ('ORD-1')")
        self.connection.execute("INSERT INTO order_items VALUES ('ORD-1')")
        self.proxy = InspectableConnection(self.connection)

    def tearDown(self):
        self.connection.close()

    def test_order_and_its_items_are_deleted_together(self):
        with patch.object(database, "get_db_connection", return_value=self.proxy):
            result = database.delete_order_transaction("ORD-1")

        self.assertEqual(result["transaction_id"], "ORD-1")
        self.assertEqual(self.connection.execute("SELECT COUNT(*) FROM order_items").fetchone()[0], 0)
        self.assertEqual(self.connection.execute("SELECT COUNT(*) FROM order_transactions").fetchone()[0], 0)
        self.assertTrue(self.proxy.closed)

    def test_missing_order_preserves_other_records_and_returns_404(self):
        with patch.object(database, "get_db_connection", return_value=self.proxy):
            with self.assertRaises(HTTPException) as raised:
                database.delete_order_transaction("ORD-MISSING")

        self.assertEqual(raised.exception.status_code, 404)
        self.assertEqual(self.connection.execute("SELECT COUNT(*) FROM order_items").fetchone()[0], 1)
        self.assertEqual(self.connection.execute("SELECT COUNT(*) FROM order_transactions").fetchone()[0], 1)
        self.assertTrue(self.proxy.closed)

    def test_failed_parent_delete_restores_order_items(self):
        class FailingParentDelete(InspectableConnection):
            def execute(self, query, *args):
                if query.strip().startswith("DELETE FROM order_transactions"):
                    raise RuntimeError("Parent is still referenced")
                return super().execute(query, *args)

        proxy = FailingParentDelete(self.connection)
        with patch.object(database, "get_db_connection", return_value=proxy):
            with self.assertRaises(HTTPException) as failed:
                database.delete_order_transaction("ORD-1")

        self.assertEqual(failed.exception.status_code, 500)
        self.assertEqual(self.connection.execute("SELECT COUNT(*) FROM order_items").fetchone()[0], 1)
        self.assertEqual(self.connection.execute("SELECT COUNT(*) FROM order_transactions").fetchone()[0], 1)
        self.assertTrue(proxy.closed)


class DeleteValidationTests(unittest.TestCase):
    def setUp(self):
        self.admin_request = SimpleNamespace(session={"user": {"role": "admin", "id": "admin-1"}})

    def test_missing_material_and_product_return_not_found(self):
        with patch.object(database, "delete_material", return_value={"success": False, "message": "Material not found."}):
            with self.assertRaises(HTTPException) as missing_material:
                delete_material("MAT-MISSING", self.admin_request)
        self.assertEqual(missing_material.exception.status_code, 404)

        with patch.object(database, "delete_product", return_value={"success": False, "message": "Product not found."}):
            with self.assertRaises(HTTPException) as missing_product:
                delete_product(self.admin_request, "PROD-MISSING")
        self.assertEqual(missing_product.exception.status_code, 404)

    def test_order_delete_requires_an_administrator(self):
        with patch.object(database, "delete_order_transaction") as delete:
            with self.assertRaises(HTTPException) as forbidden:
                delete_order_route("ORD-1", SimpleNamespace(session={"user": {"role": "employee"}}))

        self.assertEqual(forbidden.exception.status_code, 403)
        delete.assert_not_called()

    def test_retention_requires_at_least_five_years(self):
        with self.assertRaises(ValueError):
            database.delete_old_transactions(4, admin_id="admin-1", dry_run=True)


if __name__ == "__main__":
    unittest.main()
