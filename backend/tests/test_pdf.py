"""PDF rendering without a database."""

from weasyprint import HTML

from app.services import pdf
from tests.plan_samples import sample_plan


def test_html_contains_the_plan_content():
    html = pdf.render_html(sample_plan())
    assert "fat loss plan" in html
    assert "2050" in html and "164 g" in html  # targets
    assert "Full Body Compound Lift" in html  # a workout
    assert "Oats with berries" in html  # a meal
    assert "Day total" in html
    assert "Avoiding</strong> peanuts" in html


def test_model_and_user_text_is_escaped():
    html = pdf.render_html(
        sample_plan(meal_text="<script>alert(1)</script> & <img src=x>", workout_name="<b>Evil</b>")
    )
    assert "<script>" not in html and "<img src=x>" not in html and "<b>Evil</b>" not in html
    assert "&lt;script&gt;" in html


def test_only_https_youtube_urls_become_links():
    assert pdf.safe_video_url("https://youtu.be/DXuStgWuJV8") == "https://youtu.be/DXuStgWuJV8"
    assert pdf.safe_video_url("https://www.youtube.com/shorts/9yyKVy8OWnA?feature=share")
    for bad in ("javascript:alert(1)", "http://youtube.com/x", "https://evil.test/y", "", None):
        assert pdf.safe_video_url(bad) is None

    linked = pdf.render_html(sample_plan(video="https://youtu.be/DXuStgWuJV8"))
    assert 'href="https://youtu.be/DXuStgWuJV8"' in linked
    unlinked = pdf.render_html(sample_plan(video="javascript:alert(1)"))
    assert "javascript:" not in unlinked


def test_render_produces_a_real_multi_page_pdf():
    data = pdf.render_pdf_sync(sample_plan())
    assert data.startswith(b"%PDF-")
    assert len(data) > 10_000
    # workouts and nutrition start on different pages
    assert len(HTML(string=pdf.render_html(sample_plan())).render().pages) >= 2
