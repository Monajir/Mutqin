import os
import sqlite3

from app.schemas import AyahReferenceDto


class QuranRepositoryError(Exception):
    pass


class QuranRepository:
    def __init__(self, database_path: str):
        self.database_path = database_path

    def is_ready(self) -> bool:
        if not os.path.isfile(self.database_path):
            return False
        try:
            with sqlite3.connect(self.database_path) as connection:
                count = connection.execute("SELECT COUNT(*) FROM ayahs").fetchone()[0]
            return count == 6236
        except (sqlite3.Error, TypeError):
            return False

    def fetch_canonical_ayahs(
        self, references: list[AyahReferenceDto]
    ) -> list[tuple[int, int, list[str]]]:
        if not self.is_ready():
            raise QuranRepositoryError("The Quran content database is unavailable or incomplete.")

        result: list[tuple[int, int, list[str]]] = []
        with sqlite3.connect(self.database_path) as connection:
            for reference in references:
                row = connection.execute(
                    "SELECT text_arabic FROM ayahs WHERE surah_id = ? AND ayah_number = ?",
                    (reference.surahId, reference.ayahNumber),
                ).fetchone()
                if row is None:
                    raise QuranRepositoryError(
                        f"Ayah {reference.surahId}:{reference.ayahNumber} does not exist."
                    )
                result.append((reference.surahId, reference.ayahNumber, row[0].split()))
        return result
