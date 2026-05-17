import uuid
from django.db import models
from django.utils import timezone
from apps.common.models import ClubScopedModel


class Competition(ClubScopedModel):
    """A competition event the club hosts or sends entries to."""

    COMP_TYPE_HOME = 'home'
    COMP_TYPE_AWAY = 'away'
    TYPE_CHOICES = [('home', 'Home Competition'), ('away', 'Away Competition')]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    comp_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='home')
    start_date = models.DateField()
    end_date = models.DateField()
    venue = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=2, blank=True)
    sanction_number = models.CharField(max_length=50, blank=True)
    entry_deadline = models.DateTimeField(null=True, blank=True)
    late_entry_deadline = models.DateTimeField(null=True, blank=True)
    base_entry_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    late_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    music_upload_deadline = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    is_published = models.BooleanField(default=False)

    class Meta:
        ordering = ['-start_date']
        indexes = [models.Index(fields=['club', 'start_date', 'is_published'])]

    def __str__(self):
        return f"{self.name} ({self.start_date})"

    @property
    def is_entry_open(self):
        now = timezone.now()
        if self.late_entry_deadline:
            return now <= self.late_entry_deadline
        if self.entry_deadline:
            return now <= self.entry_deadline
        return True

    @property
    def is_late(self):
        if not self.entry_deadline:
            return False
        return timezone.now() > self.entry_deadline

    @property
    def entry_count(self):
        return self.entries.filter(status__in=['submitted', 'confirmed', 'accepted']).count()


class EventCategory(ClubScopedModel):
    """A category/event within a competition (e.g. Pre-Juvenile Ladies Free Skate)."""

    DISCIPLINE_SINGLES = 'singles'
    DISCIPLINE_PAIRS = 'pairs'
    DISCIPLINE_DANCE = 'dance'
    DISCIPLINE_SYNC = 'synchronized'
    DISCIPLINE_CHOICES = [
        ('singles', 'Singles'),
        ('pairs', 'Pairs'),
        ('dance', 'Ice Dance'),
        ('synchronized', 'Synchronized Skating'),
    ]

    SEGMENT_FS = 'free_skate'
    SEGMENT_SP = 'short_program'
    SEGMENT_MITF = 'moves'
    SEGMENT_PATTERN = 'pattern'
    SEGMENT_CHOICES = [
        ('free_skate', 'Free Skate'),
        ('short_program', 'Short Program'),
        ('moves', 'Moves in the Field'),
        ('pattern', 'Pattern Dance'),
        ('rhythm_dance', 'Rhythm Dance'),
        ('free_dance', 'Free Dance'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=200)
    discipline = models.CharField(max_length=20, choices=DISCIPLINE_CHOICES, default='singles')
    segment = models.CharField(max_length=20, choices=SEGMENT_CHOICES, default='free_skate')
    level = models.CharField(max_length=100)
    additional_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    max_entries = models.IntegerField(null=True, blank=True)
    scheduled_time = models.DateTimeField(null=True, blank=True)
    flight_number = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ['discipline', 'level', 'segment']
        indexes = [models.Index(fields=['club', 'competition'])]

    def __str__(self):
        return f"{self.name} @ {self.competition.name}"


class CompetitionEntry(ClubScopedModel):
    """A skater's entry into one event category of a competition."""

    STATUS_DRAFT = 'draft'
    STATUS_SUBMITTED = 'submitted'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_ACCEPTED = 'accepted'
    STATUS_SCRATCHED = 'scratched'
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('confirmed', 'Confirmed (paid)'),
        ('accepted', 'Accepted by organizer'),
        ('scratched', 'Scratched'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE, related_name='entries')
    category = models.ForeignKey(EventCategory, on_delete=models.CASCADE, related_name='entries')
    skater = models.ForeignKey('members.Skater', on_delete=models.CASCADE, related_name='competition_entries')
    coach = models.ForeignKey(
        'scheduling.Coach',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='coached_entries',
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    entry_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    is_late = models.BooleanField(default=False)

    # Music
    music_title = models.CharField(max_length=200, blank=True)
    music_artist = models.CharField(max_length=200, blank=True)
    music_duration_seconds = models.IntegerField(null=True, blank=True)

    # Draw / scheduling
    draw_number = models.IntegerField(null=True, blank=True)
    skating_order = models.IntegerField(null=True, blank=True)

    # Results
    placement = models.IntegerField(null=True, blank=True)
    score = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    result_notes = models.TextField(blank=True)

    scratched_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['competition', 'category', 'skating_order']
        unique_together = [['competition', 'category', 'skater']]
        indexes = [
            models.Index(fields=['club', 'competition', 'status']),
            models.Index(fields=['club', 'skater']),
        ]

    def __str__(self):
        return f"{self.skater.full_name} — {self.category.name}"

    @property
    def total_fee(self):
        return self.entry_fee + (self.competition.late_fee if self.is_late else 0)
