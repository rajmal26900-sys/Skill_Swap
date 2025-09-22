from django.shortcuts import render, get_object_or_404, redirect
from .models import Blog , BlogSection , BlogImages
from apps.accounts.views import login_required_custom
from apps.accounts.models import User
from apps.category_skills.models import SkillsCategory
from django.contrib import messages
from django.core.files.storage import default_storage

def BlogView(request):
    blogs = Blog.objects.filter(is_published=True).select_related("author")

    custom_user = request.session.get("user_id")

    # Excludes the blogs from the current logged-in user
    if custom_user:
        blogs = blogs.exclude(author=custom_user)

    categories = SkillsCategory.objects.all().order_by("name")

    return render(request, "blog/blog.html", {"blogs": blogs, "categories": categories})

def BlogDetailView(request, pk):
    blog = get_object_or_404(
        Blog.objects.select_related("author", "category").prefetch_related("sections", "images"),
        pk=pk,
        is_published=True
    )

    # Fetch ordered sections (each has its own `images` field)
    sections = blog.sections.all().order_by("order")

    # Pick blog's base image (from BlogImages model)
    base_image = blog.images.filter(base=True).first()

    return render(request, "blog/blog-details.html", {
        "blog": blog,
        "sections": sections,
        "base_image": base_image,   # available in template
    })


@login_required_custom
def BlogProfileView(request):
    user_id = request.session.get("user_id")
    user = get_object_or_404(User, id=user_id)

    user_blogs = Blog.objects.filter(author=user).prefetch_related("images").order_by("-created_at")  # user's blogs

    for blog in user_blogs:
        blog.thumbnail_image = blog.images.filter(thumbnail=True).first()

    context = {
        "custom_user": user,
        "user_blogs": user_blogs,
    }
    return render(request, "blog/blogs_profile.html", context)

@login_required_custom
def AddBlogView(request):
    user_id = request.session.get("user_id")    
    user = get_object_or_404(User, id=user_id)
    categories = SkillsCategory.objects.all()

    if request.method == "POST":
        title = request.POST.get("title")
        category_id = request.POST.get("category")
        intro = request.POST.get("intro")
        category = get_object_or_404(SkillsCategory, id=category_id) if category_id else None

        # Create Blog
        blog = Blog.objects.create(author=user, title=title, category=category, intro=intro)

        # Handle intro images with roles
        files = request.FILES.getlist("intro_images_files[]")
        roles = request.POST.getlist("intro_images_roles[]")

        # Keep track of thumbnail/base to overwrite previous
        for file, role in zip(files, roles):
            if role == 'thumbnail':
                BlogImages.objects.filter(blog=blog, thumbnail=True).delete()
                BlogImages.objects.create(blog=blog, image=file, thumbnail=True)
            elif role == 'base':
                BlogImages.objects.filter(blog=blog, base=True).delete()
                BlogImages.objects.create(blog=blog, image=file, base=True)
            elif role == 'small':
                BlogImages.objects.create(blog=blog, image=file, small=True)

        # Handle sections
        section_titles = request.POST.getlist("section_title[]")
        section_contents = request.POST.getlist("section_content[]")
        section_orders = request.POST.getlist("section_order[]")
        section_files = request.FILES.getlist("section_image[]")

        for idx, title in enumerate(section_titles):
            if not title and not section_contents[idx]:
                continue
            section_image = section_files[idx] if idx < len(section_files) else None
            BlogSection.objects.create(
                blog=blog,
                title=title,
                content=section_contents[idx],
                images=section_image,
                order=section_orders[idx] or 0,
            )

        messages.success(request, "Your blog has been published successfully!")
        return redirect("blog:blog-profile-view")

    return render(request, "blog/add_blog.html", {"custom_user": user, "categories": categories})


@login_required_custom
def BlogEditView(request, pk):
    user_id = request.session.get("user_id")
    user = get_object_or_404(User, id=user_id)
    blog = get_object_or_404(
        Blog.objects.prefetch_related("sections", "images"),
        pk=pk,
        author=user,
    )
    categories = SkillsCategory.objects.all()

    if request.method == "POST":
        blog.title = request.POST.get("title")
        blog.category_id = request.POST.get("category")
        blog.intro = request.POST.get("intro")
        blog.save()

        # --- Handle Existing Images Replacement ---
        for img in blog.images.all():
            replace_file = request.FILES.get(f"replace_image_{img.id}")
            if replace_file:
                img.image = replace_file
            role = request.POST.get(f"role_{img.id}") or "small"
            img.thumbnail = role == "thumbnail"
            img.base = role == "base"
            img.small = role == "small"
            img.save()

        # --- Handle New Images ---
        new_images = request.FILES.getlist("images[]")
        new_roles = request.POST.getlist("image_role[]")  # ensure JS submits name="image_role[]"
        for f, role in zip(new_images, new_roles):
            BlogImages.objects.create(
                blog=blog,
                image=f,
                base=(role == "base"),
                thumbnail=(role == "thumbnail"),
                small=(role == "small"),
            )

        # --- Handle Sections ---
        section_titles = request.POST.getlist("section_title[]")
        section_contents = request.POST.getlist("section_content[]")
        section_orders = request.POST.getlist("section_order[]")

        # Delete old sections
        blog.sections.all().delete()

        # Add updated/new sections
        for idx, title in enumerate(section_titles):
            if title.strip() or section_contents[idx].strip():
                img_field = request.FILES.get(f"section_image_{idx}") or None
                BlogSection.objects.create(
                    blog=blog,
                    title=title,
                    content=section_contents[idx],
                    images=img_field,
                    order=int(section_orders[idx]) if section_orders[idx] else 0,
                )

        messages.success(request, "Blog updated successfully!")
        return redirect("blog:blog-profile-view")

    return render(
        request,
        "blog/edit_blog.html",
        {"blog": blog, "categories": categories},
    )

