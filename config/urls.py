from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/',admin.site.urls),
    path('',include('apps.core.urls')),
    path('courses/',include('apps.category_skills.urls')),
    path('',include('apps.accounts.urls')),
    path('notifications/',include('apps.notifications.urls')),
    path('universities/',include('apps.university.urls')),
    path('',include('apps.api.urls')),
    path('',include('apps.blog.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)