from django.contrib import admin
from .models import Project, ProjectPage


class ProjectPageInline(admin.TabularInline):
    model = ProjectPage
    extra = 0
    readonly_fields = ('page_number', 'image_file', 'width', 'height')


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'status', 'download_enabled', 'is_published', 'created_at')
    list_filter = ('status', 'download_enabled', 'is_published', 'created_at')
    search_fields = ('title', 'slug', 'user__email')
    readonly_fields = ('slug', 'published_slug', 'created_at', 'updated_at', 'processing_started_at', 'processing_completed_at')
    inlines = [ProjectPageInline]
    
    fieldsets = (
        ('Basic', {'fields': ('user', 'title', 'slug', 'description')}),
        ('Files', {'fields': ('pdf_file', 'pages_json')}),
        ('Status', {'fields': ('status', 'error_message', 'total_pages')}),
        ('Processing', {'fields': ('processing_started_at', 'processing_completed_at')}),
        ('Download', {'fields': ('download_enabled', 'download_paid_at', 'download_stripe_payment_intent_id')}),
        ('Publishing', {'fields': ('is_published', 'published_at', 'published_slug')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )
    
    def get_readonly_fields(self, request, obj=None):
        if obj:  # editing an existing object
            return self.readonly_fields + ('user',)
        return self.readonly_fields


@admin.register(ProjectPage)
class ProjectPageAdmin(admin.ModelAdmin):
    list_display = ('project', 'page_number', 'width', 'height')
    list_filter = ('project',)
    search_fields = ('project__title',)

