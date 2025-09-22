document.addEventListener("DOMContentLoaded", function () {
    const container = document.getElementById("sections-container");
    const addBtn = document.getElementById("add-section");
    const form = document.querySelector("form");
    const introInput = document.getElementById("intro-images");

    // Store only intro images with roles
    const uploadedIntroImages = []; // each item: {file, role}

    // CKEditor init
    function initEditors() {
        document.querySelectorAll(".rich-editor").forEach((textarea) => {
            if (!textarea.hasAttribute("data-ckeditor-initialized")) {
                CKEDITOR.replace(textarea, { height: 150 });
                textarea.setAttribute("data-ckeditor-initialized", "true");
            }
        });
    }

    // 1. Preview function specifically for INTRO images with roles
    function attachIntroImagePreview(input) {
        const previewContainer = input.closest(".card-body")?.querySelector(".image-preview-container");
        if (!previewContainer) return;

        input.addEventListener("change", function () {
            Array.from(this.files).forEach((file) => {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const wrapper = document.createElement("div");
                    wrapper.classList.add("card", "p-2", "mb-2");
                    // Use unique name for radio buttons for each image
                    const uniqueName = `role_${file.name}_${Date.now()}`;
                    wrapper.innerHTML = `
                        <div class="d-flex align-items-center">
                            <img src="${e.target.result}" alt="preview" class="me-3 rounded" style="width:80px;height:80px;object-fit:cover;">
                            <div>
                                <p class="mb-1 fw-bold">${file.name}</p>
                                <div class="form-check">
                                    <input class="form-check-input role-radio" type="radio" name="${uniqueName}" value="thumbnail">
                                    <label class="form-check-label">Thumbnail</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input role-radio" type="radio" name="${uniqueName}" value="base">
                                    <label class="form-check-label">Base</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input role-checkbox" type="checkbox" value="small">
                                    <label class="form-check-label">Small</label>
                                </div>
                            </div>
                        </div>
                    `;
                    previewContainer.appendChild(wrapper);

                    // Add event listeners to track roles
                    const radios = wrapper.querySelectorAll(".role-radio");
                    const smallCheckbox = wrapper.querySelector(".role-checkbox");

                    function updateImageRoles() {
                        // Find and remove any previous roles for this file
                        const indicesToRemove = uploadedIntroImages.map((img, index) => img.file === file ? index : -1).filter(index => index !== -1);
                        indicesToRemove.reverse().forEach(index => uploadedIntroImages.splice(index, 1));

                        // Add new roles based on selection
                        radios.forEach(r => {
                            if (r.checked) uploadedIntroImages.push({ file: file, role: r.value });
                        });
                        if (smallCheckbox.checked) uploadedIntroImages.push({ file: file, role: 'small' });
                    }

                    radios.forEach(r => r.addEventListener("change", updateImageRoles));
                    smallCheckbox.addEventListener("change", updateImageRoles);
                };
                reader.readAsDataURL(file);
            });
            input.value = ""; // Clear input to allow re-uploading the same file
        });
    }
    
    // 2. A simpler preview function for SECTION images (no roles)
    function attachSectionImagePreview(input) {
        const previewContainer = input.closest(".card-body")?.querySelector(".image-preview-container");
        if (!previewContainer) return;

        input.addEventListener("change", function () {
            previewContainer.innerHTML = ''; // Clear previous preview
            if (this.files.length > 0) {
                const file = this.files[0];
                const reader = new FileReader();
                reader.onload = function (e) {
                    previewContainer.innerHTML = `
                        <div class="card p-2 mb-2">
                            <div class="d-flex align-items-center">
                                <img src="${e.target.result}" alt="preview" class="me-3 rounded" style="width:80px;height:80px;object-fit:cover;">
                                <p class="mb-0 fw-bold">${file.name}</p>
                            </div>
                        </div>
                    `;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // 3. Attach the correct preview function to the correct inputs
    if (introInput) attachIntroImagePreview(introInput);
    document.querySelectorAll(".section-image-input").forEach(input => attachSectionImagePreview(input));

    // Add new sections
    addBtn.addEventListener("click", function () {
        const newSection = document.createElement("div");
        newSection.classList.add("card", "border", "mb-3", "section-item");
        newSection.innerHTML = `
        <div class="card-body">
            <div class="mb-2">
                <label class="form-label">Section Title</label>
                <input type="text" name="section_title[]" class="form-control" placeholder="Enter section title">
            </div>
            <div class="mb-2">
                <label class="form-label">Content</label>
                <textarea name="section_content[]" class="form-control rich-editor" rows="4" placeholder="Write section content..."></textarea>
            </div>
            <div class="mb-3">
                <label class="form-label fw-bold">Upload Section Image</label>
                <input type="file" class="form-control section-image-input" name="section_image[]" accept="image/*">
            </div>
            <div class="image-preview-container mb-4"></div>
            <div class="mb-2">
                <label class="form-label">Order</label>
                <input type="number" name="section_order[]" class="form-control" value="0" min="0">
            </div>
            <button type="button" class="btn btn-sm btn-outline-danger remove-section">
                <i class="bi bi-trash"></i> Remove Section
            </button>
        </div>`;
        container.appendChild(newSection);
        initEditors();
        // Attach the simple section preview to the new input
        newSection.querySelectorAll(".section-image-input").forEach(input => attachSectionImagePreview(input));
    });

    // Remove section
    container.addEventListener("click", function (e) {
        if (e.target.closest(".remove-section")) {
            const section = e.target.closest(".section-item");
            const textarea = section.querySelector("textarea");
            if (textarea && textarea.id && CKEDITOR.instances[textarea.id]) CKEDITOR.instances[textarea.id].destroy(true);
            section.remove();
        }
    });

    // Form submit
    if (form) {
        form.addEventListener("submit", function () {
            // Update CKEditor instances
            for (let instance in CKEDITOR.instances) {
                if (CKEDITOR.instances.hasOwnProperty(instance)) CKEDITOR.instances[instance].updateElement();
            }

            // Append hidden inputs ONLY for the intro images
            uploadedIntroImages.forEach(img => {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(img.file);

                const fileInput = document.createElement("input");
                fileInput.type = "file";
                fileInput.name = "intro_images_files[]";
                fileInput.files = dataTransfer.files;
                fileInput.style.display = "none";

                const roleInput = document.createElement("input");
                roleInput.type = "hidden";
                roleInput.name = "intro_images_roles[]";
                roleInput.value = img.role;

                form.appendChild(fileInput);
                form.appendChild(roleInput);
            });
        });
    }

    if (document.getElementById("intro-editor")) CKEDITOR.replace("intro-editor", { height: 200 });
    initEditors();
});