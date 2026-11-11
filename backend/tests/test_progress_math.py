"""Streaks, weeks and date plausibility: pure functions, no database."""

from datetime import date, timedelta

import pytest

from app.services import progress
from app.services.progress import (
    LogDateInvalid,
    build_progress,
    streak_days,
    streak_weeks,
    week_start,
)

# 2026-11-11 is a Wednesday. Monday = 2026-11-09, previous Sunday = 2026-11-08.
WED = date(2026, 11, 11)


def d(offset: int, base: date = WED) -> date:
    return base + timedelta(days=offset)


def test_week_start_is_monday():
    assert week_start(WED) == date(2026, 11, 9)
    assert week_start(date(2026, 11, 9)) == date(2026, 11, 9)  # Monday itself
    assert week_start(date(2026, 11, 15)) == date(2026, 11, 9)  # Sunday belongs to the same week
    assert week_start(date(2026, 11, 16)) == date(2026, 11, 16)  # next Monday starts a new one


def test_no_sessions_means_no_streak():
    assert streak_days(set(), WED) == 0
    assert streak_weeks(set(), WED) == 0


def test_streak_days_counts_back_from_today():
    assert streak_days({d(0)}, WED) == 1
    assert streak_days({d(0), d(-1), d(-2)}, WED) == 3


def test_today_not_done_yet_does_not_break_the_streak():
    assert streak_days({d(-1), d(-2)}, WED) == 2


def test_a_missed_day_breaks_the_streak():
    assert streak_days({d(-2), d(-3)}, WED) == 0  # yesterday and today both empty
    assert streak_days({d(0), d(-2)}, WED) == 1  # gap yesterday


def test_streak_days_crosses_month_and_year_boundaries():
    new_year = date(2027, 1, 2)
    assert streak_days({date(2026, 12, 31), date(2027, 1, 1), new_year}, new_year) == 3


def test_streak_weeks_needs_one_session_in_each_consecutive_week():
    this_week, last_week, two_ago, four_ago = d(0), d(-7), d(-14), d(-28)
    assert streak_weeks({this_week, last_week, two_ago, four_ago}, WED) == 3  # gap at 3 weeks ago
    assert streak_weeks({last_week}, WED) == 1  # this week still empty: not broken yet
    assert streak_weeks({two_ago}, WED) == 0  # last week empty: broken


def test_streak_weeks_across_the_year_boundary():
    sunday = date(2027, 1, 3)  # ISO week 53 of 2026
    # weeks starting 2026-12-14, 2026-12-21 and 2026-12-28 (which ends on 2027-01-03)
    assert streak_weeks({date(2026, 12, 15), date(2026, 12, 22), sunday}, sunday) == 3
    # 12-29 and 01-03 are the SAME week, so that is only two weeks
    assert streak_weeks({date(2026, 12, 21), date(2026, 12, 29), sunday}, sunday) == 2


def test_sunday_night_belongs_to_the_old_week_monday_morning_starts_a_new_one():
    monday = date(2026, 11, 9)
    sunday = date(2026, 11, 8)
    progress_on_monday = build_progress({sunday: 1}, monday, 3)
    assert progress_on_monday.week.sessions == 0  # Sunday is last week
    assert progress_on_monday.streak_days == 1  # yesterday keeps the day streak alive
    assert progress_on_monday.streak_weeks == 1  # last week keeps the week streak alive
    assert progress_on_monday.week.start == monday and progress_on_monday.week.end == d(6, monday)

    on_sunday = build_progress({monday: 1}, d(6, monday), 3)
    assert on_sunday.week.sessions == 1  # Monday-Sunday is one week


def test_week_view_has_seven_days_with_session_counts():
    result = build_progress({d(0): 2, d(-1): 1, d(-10): 1}, WED, 4)
    assert [day.date for day in result.week.days] == [d(-2) + timedelta(days=i) for i in range(7)]
    assert [day.sessions for day in result.week.days] == [0, 1, 2, 0, 0, 0, 0]
    assert result.week.sessions == 3  # two workouts on one day count twice
    assert result.week.active_days == 2
    assert result.week.target_days == 4
    assert result.total_sessions == 4 and result.total_active_days == 3
    assert result.last_session_on == WED


def test_empty_history():
    result = build_progress({}, WED, None)
    assert result.total_sessions == 0 and result.last_session_on is None
    assert result.week.target_days is None
    assert (result.streak_days, result.streak_weeks) == (0, 0)


def test_a_log_dated_tomorrow_is_ignored_until_tomorrow():
    """A user in UTC+10 logs 'today' (their date) while a UTC-based view still says
    yesterday: the day after the viewer's today must not count or extend anything."""
    result = build_progress({d(1): 1, d(0): 1}, WED, 3)
    assert result.total_sessions == 1
    assert result.streak_days == 1
    assert result.last_session_on == WED


# ── plausibility of client-supplied dates ───────────────────────────────────


@pytest.fixture
def frozen_utc(monkeypatch):
    monkeypatch.setattr(progress, "utc_today", lambda: WED)


def test_dates_one_day_either_side_of_utc_are_fine_for_every_timezone(frozen_utc):
    for offset in (-1, 0, 1):  # UTC-12 ... UTC+14 reach at most one calendar day away
        assert progress.check_plausible(d(offset)) == d(offset)
        assert progress.check_today(d(offset)) == d(offset)


def test_future_dates_are_refused(frozen_utc):
    with pytest.raises(LogDateInvalid):
        progress.check_plausible(d(2))
    with pytest.raises(LogDateInvalid):
        progress.check_today(d(2))


def test_back_dating_is_allowed_for_logs_but_not_for_today(frozen_utc):
    assert progress.check_plausible(d(-365))
    with pytest.raises(LogDateInvalid):
        progress.check_plausible(d(-366))
    with pytest.raises(LogDateInvalid):
        progress.check_today(d(-2))
