"""Клиент Lex API без зависимостей (stdlib, Python 3.9+).

    from lexapi import Lex
    lex = Lex("https://lex.example.ru", key="lex_...")

    r = lex.answer("ст. 330 ГК")                 # умный поиск: несколько блоков ответа
    for a in r["answers"]:
        print(a["type"], a["title"])

    art = lex.law_article("330", code="ГК")       # текст статьи одним вызовом
    print(art["part"]["text"])
    for link in Lex.links(art["part"]["md"]):     # ссылки на другие нормы и редакции
        print(link["label"], link["id"], link["part"])

    lex.arbitr_search(side="7707083893", caseType="B")
    lex.courts_hearings(site, "18.11.2026")

Ошибки: AuthError (401 — нет или неверный ключ), QuotaError (402 — закончились запросы),
LexError — прочее. Сетевые сбои, 429 и 5xx повторяются с паузой.
"""
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor


class LexError(Exception):
    def __init__(self, status, body):
        super().__init__(f"{status}: {body.get('error', body)}")
        self.status, self.body, self.code = status, body, body.get("code")


class AuthError(LexError):
    """401: нужен вход — передайте key= (API-ключ из раздела «Интеграции»)."""


class QuotaError(LexError):
    """402: запросы по тарифу закончились."""


_MD = re.compile(r"\[([^\]]+)\]\(law:([A-Z]+_\d+)(?:/([0-9a-f]{40}))?\)")


class Lex:
    def __init__(self, base="http://127.0.0.1:8090", key=None, timeout=150, retries=3):
        self.base, self.key, self.timeout, self.retries = base.rstrip("/"), key, timeout, retries

    # ---------- транспорт ----------
    def _req(self, method, path, params=None, body=None):
        q = {k: v for k, v in (params or {}).items() if v not in (None, "")}
        url = self.base + path + ("?" + urllib.parse.urlencode(q) if q else "")
        headers = {"Accept": "application/json"}
        if self.key:
            headers["X-API-Key"] = self.key
        data = None
        if body is not None:
            data, headers["Content-Type"] = json.dumps(body).encode(), "application/json"
        last = None
        for attempt in range(self.retries):
            try:
                with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers, method=method), timeout=self.timeout) as r:
                    return json.load(r)
            except urllib.error.HTTPError as e:
                try:
                    payload = json.load(e)
                except Exception:
                    payload = {"error": e.reason}
                if e.code == 401:
                    raise AuthError(e.code, payload) from None
                if e.code == 402:
                    raise QuotaError(e.code, payload) from None
                last = LexError(e.code, payload)
                if e.code not in (429, 500, 502, 503, 504):
                    raise last from None
            except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
                last = LexError(0, {"error": str(e)})
            time.sleep(1.5 * (attempt + 1))
        raise last

    def get(self, path, **params):
        return self._req("GET", path, params)

    def many(self, calls, workers=8):
        """Параллельно: lex.many([lambda: lex.law_doc(i) for i in ids])."""
        with ThreadPoolExecutor(workers) as ex:
            return list(ex.map(lambda f: f(), calls))

    # ---------- умный поиск ----------
    def answer(self, q):
        """ИНН, номер дела, «159-ФЗ», «ст. 330 ГК», «постановление 442» или вопрос → {intents, answers}."""
        return self.get("/v1/answer", q=q)

    def search(self, q):
        return self.get("/v1/search", q=q)

    def health(self):
        return self.get("/v1/health")

    def me(self):
        return self.get("/v1/auth/me")

    # ---------- арбитраж ----------
    def arbitr_search(self, **f):
        """Фильтры: q, side, role, caseNumber, courts, dateFrom, dateTo, caseType, page."""
        return self.get("/v1/arbitr/search", **f)

    def arbitr_pages(self, pages=4, **f):
        """Несколько страниц выдачи сразу (до 25 дел на странице)."""
        first = self.arbitr_search(page=1, **f)
        rest = self.many([lambda p=p: self.arbitr_search(page=p, **f) for p in range(2, min(pages, first.get("pages", 1)) + 1)])
        return [c for r in [first, *rest] for c in r.get("cases", [])]

    def arbitr_case(self, guid, part="all"):
        return self.get(f"/v1/arbitr/case/{guid}" + (f"/{part}" if part else ""))

    def arbitr_by_number(self, number):
        return self.get("/v1/arbitr/case/by-number", number=number)

    def arbitr_doc_text(self, case_id, doc_id):
        return self.get(f"/v1/arbitr/doc/{case_id}/{doc_id}/text")

    def arbitr_courts(self):
        return self.get("/v1/arbitr/courts")

    # ---------- суды общей юрисдикции ----------
    def courts_hearings(self, site, date=None):
        return self.get("/v1/courts/hearings", site=site, date=date)

    def courts_case(self, site, caseId, caseUid, deloId=None, **_):
        return self.get("/v1/courts/case", site=site, caseId=caseId, caseUid=caseUid, deloId=deloId)

    def courts_by_address(self, address):
        return self.get("/v1/courts/by-address", address=address)

    def courts_by_fias(self, fias):
        return self.get(f"/v1/courts/by-fias/{fias}")

    # ---------- законодательство ----------
    def law_search(self, q):
        """Результаты с kind (тип акта), date, number и part (ссылка на найденную статью)."""
        return self.get("/v1/law/search", q=q)

    def law_doc(self, doc_id):
        return self.get(f"/v1/law/doc/{doc_id}")

    def law_part(self, doc_id, part):
        return self.get(f"/v1/law/doc/{doc_id}/part/{part}")

    def law_article(self, art, code=None, law=None):
        """Статья кодекса (code="ГК") или закона (law="127-ФЗ") → {doc, part}."""
        if not (code or law):
            raise ValueError("укажите code или law")
        q = f"ст. {art} " + (code or law.upper().removesuffix("-ФЗ") + "-ФЗ")
        for a in self.answer(q).get("answers") or []:
            if a["type"] == "article":
                return a["data"]
        raise LexError(404, {"error": f"статья не найдена: {q}", "code": "not_found"})

    @staticmethod
    def links(md):
        """Ссылки из поля md: [{label, id, part}] — передайте в law_doc / law_part."""
        return [{"label": m[1], "id": m[2], "part": m[3] or None} for m in _MD.finditer(md or "")]

    @staticmethod
    def plain(md):
        """md → обычный текст без разметки ссылок."""
        return _MD.sub(r"\1", md or "")


if __name__ == "__main__":
    import os
    import sys
    lex = Lex(os.environ.get("LEX_URL", "http://127.0.0.1:8090"), key=os.environ.get("LEX_KEY"))
    r = lex.answer(" ".join(sys.argv[1:]) or "ст. 330 ГК")
    print("Поняли как:", ", ".join(i["note"] for i in r["intents"]))
    for a in r["answers"]:
        d = a["data"]
        if a["type"] == "article":
            print(f"\n[{a['title']}] {d['part']['title']}\n" + Lex.plain(d["part"]["md"])[:600])
        elif a["type"] == "laws":
            print(f"\n[{a['title']}]")
            for h in d[:5]:
                print(" -", h.get("kind", ""), h.get("number", ""), h["title"][:90])
        else:
            print(f"\n[{a['title']}]", json.dumps(d, ensure_ascii=False)[:300])
