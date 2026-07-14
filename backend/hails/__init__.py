"""Hails platform package (Axiom Rework Phase 4a).

All hail_* / hails_* / hails-only glyph_* modules live here. The API boundary
is routers/hails.py. Top-level compatibility shims (backend/hail_*.py etc.)
alias these modules so legacy `import hails_domain`-style imports keep working.
"""
