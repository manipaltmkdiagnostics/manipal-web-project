// /* ================================================
//    ADMIN PORTAL — Core Logic
//    ================================================ */

// const API = '';
// let currentUser = null;
// let token = null;

// /* ------ Init ------ */
// document.addEventListener('DOMContentLoaded', () => {
//     token = localStorage.getItem('admin_token');
//     const userStr = localStorage.getItem('admin_user');

//     if (!token || !userStr) {
//         window.location.href = '/admin/login.html';
//         return;
//     }

//     currentUser = JSON.parse(userStr);
//     initUI();
//     loadDashboard();
//     setupForms();

//     // Date display
//     const dateEl = document.getElementById('dashDate');
//     if (dateEl) {
//         dateEl.textContent = new Date().toLocaleDateString('en-IN', {
//             weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
//         });
//     }
// });

// /* ------ Auth Headers ------ */
// function authHeaders(isJson = true) {
//     const h = { 'Authorization': 'Bearer ' + token };
//     if (isJson) h['Content-Type'] = 'application/json';
//     return h;
// }

// async function apiFetch(url, options = {}) {
//     const res = await fetch(API + url, options);
//     if (res.status === 401 || res.status === 403) {
//         showToast('Session expired. Please login again.', 'error');
//         setTimeout(() => logout(), 1500);
//         throw new Error('Unauthorized');
//     }
//     return res;
// }

// /* ------ UI Init ------ */
// function initUI() {
//     // Set user info
//     document.getElementById('userName').textContent = currentUser.full_name || currentUser.username;
//     document.getElementById('userRole').textContent = currentUser.role;
//     document.getElementById('userAvatar').textContent = (currentUser.full_name || currentUser.username).charAt(0).toUpperCase();

//     // Show master-only sections
//     if (currentUser.role === 'master') {
//         document.getElementById('masterLabel').style.display = '';
//         document.getElementById('navTests').style.display = '';
//         document.getElementById('navPackages').style.display = '';
//         document.getElementById('navPhotos').style.display = '';
//         document.getElementById('navAdmins').style.display = '';
//     }
// }

// /* ------ Section Navigation ------ */
// function showSection(section, navEl) {
//     // Hide all
//     document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
//     document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));

//     // Show target
//     const el = document.getElementById('section-' + section);
//     if (el) el.classList.add('active');
//     if (navEl) navEl.classList.add('active');

//     // Load data
//     switch (section) {
//         case 'dashboard': loadDashboard(); break;
//         case 'bookings': loadBookings(); break;
//         case 'tests': loadTests(); break;
//         case 'packages': loadPackages(); break;
//         case 'photos': loadPhotos(); break;
//         case 'admins': loadAdmins(); break;
//     }
// }

// /* ------ Logout ------ */
// function logout() {
//     localStorage.removeItem('admin_token');
//     localStorage.removeItem('admin_user');
//     window.location.href = '/admin/login.html';
// }

// /* ------ Modal Controls ------ */
// function openModal(id) {
//     document.getElementById(id).classList.add('active');
// }

// function closeModal(id) {
//     document.getElementById(id).classList.remove('active');
// }

// // Close on overlay click
// document.querySelectorAll('.modal-overlay').forEach(overlay => {
//     overlay.addEventListener('click', (e) => {
//         if (e.target === overlay) overlay.classList.remove('active');
//     });
// });

// /* ------ Toast ------ */
// function showToast(message, type = 'success') {
//     const toast = document.getElementById('toast');
//     toast.textContent = message;
//     toast.className = 'toast ' + type + ' show';
//     setTimeout(() => toast.classList.remove('show'), 3000);
// }

// /* ================================================
//    DASHBOARD
//    ================================================ */
// async function loadDashboard() {
//     try {
//         const res = await apiFetch('/api/bookings/stats', { headers: authHeaders() });
//         const stats = await res.json();

//         document.getElementById('statTotal').textContent = stats.total || 0;
//         document.getElementById('statPending').textContent = stats.pending || 0;
//         document.getElementById('statCompleted').textContent = stats.completed || 0;
//         document.getElementById('statToday').textContent = stats.todayBookings || 0;

//         // Recent bookings
//         const bRes = await apiFetch('/api/bookings', { headers: authHeaders() });
//         const bookings = await bRes.json();
//         const tbody = document.getElementById('recentBookings');

//         if (bookings.length === 0) {
//             tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><div class="empty-icon">📅</div><h3>No bookings yet</h3></td></tr>';
//             return;
//         }

//         tbody.innerHTML = bookings.slice(0, 5).map(b => `
//       <tr>
//         <td><strong>${b.patient_name}</strong><br><small style="color:var(--text-muted)">${b.phone}</small></td>
//         <td>${b.test_name || '—'}</td>
//         <td>${b.preferred_date || '—'}</td>
//         <td><span class="badge badge-${b.status}">${formatStatus(b.status)}</span></td>
//       </tr>
//     `).join('');
//     } catch (err) {
//         console.error('Dashboard load failed:', err);
//     }
// }

// /* ================================================
//    BOOKINGS
//    ================================================ */
// async function loadBookings() {
//     try {
//         const status = document.getElementById('bookingStatusFilter')?.value || '';
//         const url = status ? `/api/bookings?status=${status}` : '/api/bookings';
//         const res = await apiFetch(url, { headers: authHeaders() });
//         const bookings = await res.json();
//         const tbody = document.getElementById('bookingsTable');

//         if (bookings.length === 0) {
//             tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><div class="empty-icon">📅</div><h3>No bookings found</h3></td></tr>';
//             return;
//         }

//         tbody.innerHTML = bookings.map(b => {
//             const reportBtn = b.report_file
//                 ? `<a href="/api/bookings/${b.id}/report" class="btn btn-sm btn-icon" title="Download Report" style="background:#E8F8F5;color:var(--primary);" target="_blank">📄</a>`
//                 : '';
//             return `
//       <tr>
//         <td>#${b.id}</td>
//         <td><strong>${b.patient_name}</strong>${b.email ? `<br><small style="color:var(--text-muted)">${b.email}</small>` : ''}</td>
//         <td>${b.phone}</td>
//         <td>${b.test_name || '—'}</td>
//         <td>${b.preferred_date || '—'}<br><small style="color:var(--text-muted)">${b.preferred_time || ''}</small></td>
//         <td>${b.home_collection ? '🏠 Yes' : '🏥 No'}</td>
//         <td><span class="badge badge-${b.status}">${formatStatus(b.status)}</span></td>
//         <td>
//           ${reportBtn}
//           <button class="btn btn-primary btn-sm btn-icon" onclick="openBookingUpdate(${b.id},'${b.status}','${(b.notes || '').replace(/'/g, "\\\'")}','${b.report_file || ''}')">✏️</button>
//           <button class="btn btn-danger btn-sm btn-icon" onclick="deleteBooking(${b.id})">🗑️</button>
//         </td>
//       </tr>
//     `;
//         }).join('');
//     } catch (err) {
//         console.error('Bookings load failed:', err);
//     }
// }

// function openBookingUpdate(id, status, notes, reportFile) {
//     document.getElementById('bookingId').value = id;
//     document.getElementById('bookingStatus').value = status;
//     document.getElementById('bookingNotes').value = notes;

//     // Reset report field
//     const reportFileEl = document.getElementById('reportFile');
//     if (reportFileEl) reportFileEl.value = '';

//     // Store existing report info on the form for reference
//     const form = document.getElementById('bookingUpdateForm');
//     form.dataset.existingReport = reportFile || '';

//     // Show/hide report field
//     toggleReportField();
//     openModal('bookingModal');
// }

// // Show/hide report upload field based on status selection
// function toggleReportField() {
//     const status = document.getElementById('bookingStatus').value;
//     const group = document.getElementById('reportUploadGroup');
//     const existingDiv = document.getElementById('existingReport');
//     const existingLink = document.getElementById('existingReportLink');
//     const reportNote = document.getElementById('reportNote');
//     const form = document.getElementById('bookingUpdateForm');
//     const existingReport = form?.dataset.existingReport || '';

//     if (status === 'completed') {
//         group.style.display = 'block';
//         if (existingReport) {
//             existingDiv.style.display = 'block';
//             const bookingId = document.getElementById('bookingId').value;
//             existingLink.href = `/api/bookings/${bookingId}/report`;
//             reportNote.textContent = 'A report is already uploaded. You can upload a new one to replace it.';
//         } else {
//             existingDiv.style.display = 'none';
//             reportNote.textContent = 'A PDF report is required to mark this booking as completed.';
//         }
//     } else {
//         group.style.display = 'none';
//     }
// }

// async function deleteBooking(id) {
//     if (!confirm('Delete this booking?')) return;
//     try {
//         await apiFetch(`/api/bookings/${id}`, { method: 'DELETE', headers: authHeaders() });
//         showToast('Booking deleted');
//         loadBookings();
//         loadDashboard();
//     } catch (err) {
//         showToast('Delete failed', 'error');
//     }
// }

// /* ================================================
//    TESTS (Master Admin Only)
//    ================================================ */
// async function loadTests() {
//     try {
//         const res = await apiFetch('/api/tests', { headers: authHeaders() });
//         const tests = await res.json();
//         const tbody = document.getElementById('testsTable');

//         if (tests.length === 0) {
//             tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-icon">🧪</div><h3>No tests yet</h3></td></tr>';
//             return;
//         }

//         tbody.innerHTML = tests.map(t => `
//       <tr>
//         <td><strong>${t.name}</strong><br><small style="color:var(--text-muted)">${(t.description || '').substring(0, 50)}...</small></td>
//         <td><span class="badge badge-admin">${t.category}</span></td>
//         <td style="font-weight:700;color:var(--primary);">₹${t.price}</td>
//         <td style="color:var(--text-muted);text-decoration:line-through;">${t.original_price ? '₹' + t.original_price : '—'}</td>
//         <td>${t.turnaround_time || '—'}</td>
//         <td>${t.is_popular ? '⭐ Yes' : 'No'}</td>
//         <td>
//           <button class="btn btn-primary btn-sm btn-icon" onclick='editTest(${JSON.stringify(t).replace(/'/g, "\\'")})'>✏️</button>
//           <button class="btn btn-danger btn-sm btn-icon" onclick="deleteTest(${t.id})">🗑️</button>
//         </td>
//       </tr>
//     `).join('');
//     } catch (err) {
//         console.error('Tests load failed:', err);
//     }
// }

// function openTestModal() {
//     document.getElementById('testModalTitle').textContent = 'Add New Test';
//     document.getElementById('testSubmitBtn').textContent = 'Save Test';
//     document.getElementById('testForm').reset();
//     document.getElementById('testId').value = '';
//     openModal('testModal');
// }

// function editTest(test) {
//     document.getElementById('testModalTitle').textContent = 'Edit Test';
//     document.getElementById('testSubmitBtn').textContent = 'Update Test';
//     document.getElementById('testId').value = test.id;
//     document.getElementById('testName').value = test.name;
//     document.getElementById('testCategory').value = test.category;
//     document.getElementById('testDescription').value = test.description || '';
//     document.getElementById('testParameters').value = test.parameters || '';
//     document.getElementById('testPrice').value = test.price;
//     document.getElementById('testOriginalPrice').value = test.original_price || '';
//     document.getElementById('testTurnaround').value = test.turnaround_time || '';
//     document.getElementById('testSampleType').value = test.sample_type || '';
//     document.getElementById('testFasting').checked = !!test.fasting_required;
//     document.getElementById('testPopular').checked = !!test.is_popular;

//     // Image fields
//     document.getElementById('imageStandardSize').checked = !!test.image_standard_size;
//     document.getElementById('imageMaxWidth').value = test.image_max_width || 200;
//     document.getElementById('imageMaxHeight').value = test.image_max_height || 200;

//     const preview = document.getElementById('testImagePreview');
//     const display = document.getElementById('testImageDisplay');
//     if (test.image_file) {
//         display.src = '/uploads/test-images/' + test.image_file;
//         preview.style.display = 'block';
//     } else {
//         preview.style.display = 'none';
//     }

//     toggleCustomSizeFields();
//     openModal('testModal');
// }

// function toggleCustomSizeFields() {
//     const isStd = document.getElementById('imageStandardSize').checked;
//     document.getElementById('customSizeFields').style.display = isStd ? 'none' : 'flex';
// }

// function removeTestImage() {
//     if (confirm('Remove this image?')) {
//         document.getElementById('testImagePreview').style.display = 'none';
//         document.getElementById('testImage').value = '';
//         const form = document.getElementById('testForm');
//         form.dataset.removeImage = 'true';
//     }
// }

// async function deleteTest(id) {
//     if (!confirm('Delete this test? This will soft-delete it from the public listing.')) return;
//     try {
//         await apiFetch(`/api/tests/${id}`, { method: 'DELETE', headers: authHeaders() });
//         showToast('Test deleted');
//         loadTests();
//     } catch (err) {
//         showToast('Delete failed', 'error');
//     }
// }

// /* ================================================
//    HEALTH PACKAGES (Master Admin Only)
//    ================================================ */
// async function loadPackages() {
//     try {
//         const res = await apiFetch('/api/health-packages', { headers: authHeaders() });
//         const packages = await res.json();
//         const tbody = document.getElementById('packagesTable');

//         if (packages.length === 0) {
//             tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-icon">📦</div><h3>No packages yet</h3></td></tr>';
//             return;
//         }

//         tbody.innerHTML = packages.map(p => `
//       <tr>
//         <td><strong>${p.name}</strong></td>
//         <td><small style="color:var(--text-muted)">${p.description || '—'}</small></td>
//         <td>
//             <div style="font-size:0.85rem;">
//                 ${(p.tests || []).map(t => `<span class="badge badge-admin" style="margin-right:4px;margin-bottom:4px;">${t.name}</span>`).join('')}
//             </div>
//         </td>
//         <td style="font-weight:700;color:var(--primary);">₹${p.price}</td>
//         <td>
//           <button class="btn btn-primary btn-sm btn-icon" onclick='editPackage(${JSON.stringify(p).replace(/'/g, "\\'")})'>✏️</button>
//           <button class="btn btn-danger btn-sm btn-icon" onclick="deletePackage(${p.id})">🗑️</button>
//         </td>
//       </tr>
//     `).join('');
//     } catch (err) {
//         console.error('Packages load failed:', err);
//     }
// }

// async function openPackageModal() {
//     document.getElementById('packageModalTitle').textContent = 'Add Health Package';
//     document.getElementById('packageSubmitBtn').textContent = 'Save Package';
//     document.getElementById('packageForm').reset();
//     document.getElementById('packageId').value = '';
    
//     // Load tests for selection
//     const testsList = document.getElementById('packageTestsList');
//     testsList.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">Loading tests...</p>';
    
//     try {
//         const res = await apiFetch('/api/tests', { headers: authHeaders() });
//         const tests = await res.json();
        
//         if (tests.length === 0) {
//             testsList.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">No tests available. Please add tests first.</p>';
//             return;
//         }
        
//         testsList.innerHTML = tests.map(t => `
//             <label style="display:flex;align-items:center;gap:10px;padding:6px;cursor:pointer;border-bottom:1px solid var(--border-light);">
//                 <input type="checkbox" name="packageTests" value="${t.id}" style="width:16px;height:16px;accent-color:var(--primary);">
//                 <span style="font-size:0.9rem;">${t.name} (₹${t.price})</span>
//             </label>
//         `).join('');
//     } catch (err) {
//         testsList.innerHTML = '<p style="color:var(--danger);font-size:0.9rem;">Failed to load tests.</p>';
//     }
    
//     openModal('packageModal');
// }

// async function editPackage(pkg) {
//     document.getElementById('packageModalTitle').textContent = 'Edit Health Package';
//     document.getElementById('packageSubmitBtn').textContent = 'Update Package';
//     document.getElementById('packageId').value = pkg.id;
//     document.getElementById('packageName').value = pkg.name;
//     document.getElementById('packageDescription').value = pkg.description || '';
//     document.getElementById('packagePrice').value = pkg.price;
    
//     // Load tests and check selected ones
//     const testsList = document.getElementById('packageTestsList');
//     testsList.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">Loading tests...</p>';
    
//     try {
//         const res = await apiFetch('/api/tests', { headers: authHeaders() });
//         const tests = await res.json();
//         const selectedIds = (pkg.tests || []).map(t => t.id);
        
//         testsList.innerHTML = tests.map(t => `
//             <label style="display:flex;align-items:center;gap:10px;padding:6px;cursor:pointer;border-bottom:1px solid var(--border-light);">
//                 <input type="checkbox" name="packageTests" value="${t.id}" ${selectedIds.includes(t.id) ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--primary);">
//                 <span style="font-size:0.9rem;">${t.name} (₹${t.price})</span>
//             </label>
//         `).join('');
//     } catch (err) {
//         testsList.innerHTML = '<p style="color:var(--danger);font-size:0.9rem;">Failed to load tests.</p>';
//     }
    
//     openModal('packageModal');
// }

// async function deletePackage(id) {
//     if (!confirm('Delete this health package?')) return;
//     try {
//         await apiFetch(`/api/health-packages/${id}`, { method: 'DELETE', headers: authHeaders() });
//         showToast('Package deleted');
//         loadPackages();
//     } catch (err) {
//         showToast('Delete failed', 'error');
//     }
// }

// /* ================================================
//    PHOTOS (Master Admin Only)
//    ================================================ */
// async function loadPhotos() {
//     try {
//         const res = await apiFetch('/api/photos', { headers: authHeaders() });
//         const photos = await res.json();
//         const grid = document.getElementById('photosGrid');

//         if (photos.length === 0) {
//             grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
//         <div class="empty-icon">📸</div><h3>No photos yet</h3><p>Upload photos to showcase your lab</p></div>`;
//             return;
//         }

//         grid.innerHTML = photos.map(p => `
//       <div class="photo-card">
//         <img src="/uploads/photos/${p.filename}" alt="${p.title}" loading="lazy">
//         <div class="photo-info">
//           <h4>${p.title}</h4>
//           <p>${p.category} · Order: ${p.display_order}</p>
//           <div class="photo-actions">
//             <button class="btn btn-primary btn-sm" onclick='editPhoto(${JSON.stringify(p).replace(/'/g, "\\'")})'>✏️ Edit</button>
//             <button class="btn btn-danger btn-sm" onclick="deletePhoto(${p.id})">🗑️</button>
//           </div>
//         </div>
//       </div>
//     `).join('');
//     } catch (err) {
//         console.error('Photos load failed:', err);
//     }
// }

// function openPhotoModal() {
//     document.getElementById('photoModalTitle').textContent = 'Upload Photo';
//     document.getElementById('photoSubmitBtn').textContent = 'Upload';
//     document.getElementById('photoForm').reset();
//     document.getElementById('photoId').value = '';
//     document.getElementById('photoPreview').innerHTML = '';
//     document.getElementById('photoFile').required = true;
//     openModal('photoModal');
// }

// function editPhoto(photo) {
//     document.getElementById('photoModalTitle').textContent = 'Edit Photo';
//     document.getElementById('photoSubmitBtn').textContent = 'Update';
//     document.getElementById('photoId').value = photo.id;
//     document.getElementById('photoTitle').value = photo.title;
//     document.getElementById('photoCategory').value = photo.category || 'gallery';
//     document.getElementById('photoDescription').value = photo.description || '';
//     document.getElementById('photoOrder').value = photo.display_order || 0;
//     document.getElementById('photoFile').required = false;
//     document.getElementById('photoPreview').innerHTML = `<img src="/uploads/photos/${photo.filename}" style="max-width:200px;border-radius:8px;">`;
//     openModal('photoModal');
// }

// async function deletePhoto(id) {
//     if (!confirm('Delete this photo permanently?')) return;
//     try {
//         await apiFetch(`/api/photos/${id}`, { method: 'DELETE', headers: authHeaders() });
//         showToast('Photo deleted');
//         loadPhotos();
//     } catch (err) {
//         showToast('Delete failed', 'error');
//     }
// }

// // Preview photo on select
// document.getElementById('photoFile')?.addEventListener('change', function () {
//     const file = this.files[0];
//     const preview = document.getElementById('photoPreview');
//     if (file) {
//         const reader = new FileReader();
//         reader.onload = e => {
//             preview.innerHTML = `<img src="${e.target.result}" style="max-width:200px;border-radius:8px;margin-top:8px;">`;
//         };
//         reader.readAsDataURL(file);
//     }
// });

// /* ================================================
//    ADMINS (Master Admin Only)
//    ================================================ */
// async function loadAdmins() {
//     try {
//         const res = await apiFetch('/api/admins', { headers: authHeaders() });
//         const admins = await res.json();
//         const tbody = document.getElementById('adminsTable');

//         tbody.innerHTML = admins.map(a => `
//       <tr>
//         <td><strong>${a.username}</strong></td>
//         <td>${a.full_name}</td>
//         <td><span class="badge badge-${a.role}">${a.role}</span></td>
//         <td>${new Date(a.created_at).toLocaleDateString('en-IN')}</td>
//         <td>
//           ${a.role !== 'master' ? `<button class="btn btn-danger btn-sm" onclick="deleteAdmin(${a.id})">🗑️ Remove</button>` : '<span style="color:var(--text-muted);font-size:0.8rem;">Protected</span>'}
//         </td>
//       </tr>
//     `).join('');
//     } catch (err) {
//         console.error('Admins load failed:', err);
//     }
// }

// function openAdminModal() {
//     document.getElementById('adminForm').reset();
//     openModal('adminModal');
// }

// async function deleteAdmin(id) {
//     if (!confirm('Remove this admin account?')) return;
//     try {
//         await apiFetch(`/api/admins/${id}`, { method: 'DELETE', headers: authHeaders() });
//         showToast('Admin removed');
//         loadAdmins();
//     } catch (err) {
//         showToast('Delete failed', 'error');
//     }
// }

// /* ================================================
//    FORM SUBMISSIONS
//    ================================================ */
// function setupForms() {
//     // Test form (updated for FormData/Image)
//     document.getElementById('testForm').addEventListener('submit', async (e) => {
//         e.preventDefault();
//         const id = document.getElementById('testId').value;
//         const formData = new FormData();

//         formData.append('name', document.getElementById('testName').value);
//         formData.append('category', document.getElementById('testCategory').value);
//         formData.append('description', document.getElementById('testDescription').value);
//         formData.append('parameters', document.getElementById('testParameters').value);
//         formData.append('price', document.getElementById('testPrice').value);
//         formData.append('original_price', document.getElementById('testOriginalPrice').value);
//         formData.append('turnaround_time', document.getElementById('testTurnaround').value);
//         formData.append('sample_type', document.getElementById('testSampleType').value);
//         formData.append('fasting_required', document.getElementById('testFasting').checked);
//         formData.append('is_popular', document.getElementById('testPopular').checked);

//         // Image fields
//         formData.append('image_standard_size', document.getElementById('imageStandardSize').checked);
//         formData.append('image_max_width', document.getElementById('imageMaxWidth').value);
//         formData.append('image_max_height', document.getElementById('imageMaxHeight').value);

//         const imageFile = document.getElementById('testImage').files[0];
//         if (imageFile) formData.append('image', imageFile);

//         if (e.target.dataset.removeImage === 'true') {
//             formData.append('remove_image', 'true');
//             delete e.target.dataset.removeImage;
//         }

//         try {
//             const url = id ? `/api/tests/${id}` : '/api/tests';
//             const method = id ? 'PUT' : 'POST';
//             const res = await apiFetch(url, {
//                 method,
//                 headers: { 'Authorization': 'Bearer ' + token },
//                 body: formData,
//             });

//             if (res.ok) {
//                 showToast(id ? 'Test updated!' : 'Test added!');
//                 closeModal('testModal');
//                 loadTests();
//             } else {
//                 const err = await res.json();
//                 showToast(err.error || 'Failed', 'error');
//             }
//         } catch (err) {
//             showToast('Error saving test', 'error');
//         }
//     });

//     // Photo form
//     document.getElementById('photoForm').addEventListener('submit', async (e) => {
//         e.preventDefault();
//         const id = document.getElementById('photoId').value;
//         const formData = new FormData();
//         formData.append('title', document.getElementById('photoTitle').value);
//         formData.append('category', document.getElementById('photoCategory').value);
//         formData.append('description', document.getElementById('photoDescription').value);
//         formData.append('display_order', document.getElementById('photoOrder').value);

//         const file = document.getElementById('photoFile').files[0];
//         if (file) formData.append('photo', file);

//         try {
//             const url = id ? `/api/photos/${id}` : '/api/photos';
//             const method = id ? 'PUT' : 'POST';
//             const res = await apiFetch(url, {
//                 method,
//                 headers: { 'Authorization': 'Bearer ' + token },
//                 body: formData,
//             });

//             if (res.ok) {
//                 showToast(id ? 'Photo updated!' : 'Photo uploaded!');
//                 closeModal('photoModal');
//                 loadPhotos();
//             } else {
//                 const err = await res.json();
//                 showToast(err.error || 'Upload failed', 'error');
//             }
//         } catch (err) {
//             showToast('Error uploading photo', 'error');
//         }
//     });

//     // Admin form
//     document.getElementById('adminForm').addEventListener('submit', async (e) => {
//         e.preventDefault();
//         const data = {
//             full_name: document.getElementById('adminFullName').value,
//             username: document.getElementById('adminUsername').value,
//             password: document.getElementById('adminPassword').value,
//         };

//         try {
//             const res = await apiFetch('/api/admins', {
//                 method: 'POST',
//                 headers: authHeaders(),
//                 body: JSON.stringify(data),
//             });

//             if (res.ok) {
//                 showToast('Admin created!');
//                 closeModal('adminModal');
//                 loadAdmins();
//             } else {
//                 const err = await res.json();
//                 showToast(err.error || 'Failed', 'error');
//             }
//         } catch (err) {
//             showToast('Error creating admin', 'error');
//         }
//     });

//     // Booking update form (uses FormData for PDF upload)
//     document.getElementById('bookingUpdateForm').addEventListener('submit', async (e) => {
//         e.preventDefault();
//         const id = document.getElementById('bookingId').value;
//         const status = document.getElementById('bookingStatus').value;
//         const notes = document.getElementById('bookingNotes').value;
//         const reportFileInput = document.getElementById('reportFile');
//         const existingReport = e.target.dataset.existingReport || '';

//         // Validate: if completing and no existing report, must upload
//         if (status === 'completed' && !existingReport && (!reportFileInput || !reportFileInput.files[0])) {
//             showToast('Please upload a PDF report before marking as completed.', 'error');
//             return;
//         }

//         const formData = new FormData();
//         formData.append('status', status);
//         formData.append('notes', notes);

//         if (reportFileInput && reportFileInput.files[0]) {
//             formData.append('report', reportFileInput.files[0]);
//         }

//         try {
//             const res = await apiFetch(`/api/bookings/${id}`, {
//                 method: 'PUT',
//                 headers: { 'Authorization': 'Bearer ' + token },
//                 body: formData,
//             });

//             if (res.ok) {
//                 showToast('Booking updated!');
//                 closeModal('bookingModal');
//                 loadBookings();
//                 loadDashboard();
//             } else {
//                 const err = await res.json();
//                 showToast(err.error || 'Update failed', 'error');
//             }
//         } catch (err) {
//             showToast('Error updating booking', 'error');
//         }
//     });

//     // Package form
//     document.getElementById('packageForm').addEventListener('submit', async (e) => {
//         e.preventDefault();
//         const id = document.getElementById('packageId').value;
//         const testCheckboxes = document.querySelectorAll('input[name="packageTests"]:checked');
//         const testIds = Array.from(testCheckboxes).map(cb => cb.value); // Keep as strings — Firestore doc IDs are strings
        
//         if (testIds.length === 0) {
//             showToast('Please select at least one test', 'error');
//             return;
//         }

//         const data = {
//             name: document.getElementById('packageName').value,
//             description: document.getElementById('packageDescription').value,
//             price: document.getElementById('packagePrice').value,
//             testIds: testIds
//         };

//         try {
//             const url = id ? `/api/health-packages/${id}` : '/api/health-packages';
//             const method = id ? 'PUT' : 'POST';
//             const res = await apiFetch(url, {
//                 method,
//                 headers: authHeaders(),
//                 body: JSON.stringify(data),
//             });

//             if (res.ok) {
//                 showToast(id ? 'Package updated!' : 'Package created!');
//                 closeModal('packageModal');
//                 loadPackages();
//             } else {
//                 const err = await res.json();
//                 showToast(err.error || 'Failed', 'error');
//             }
//         } catch (err) {
//             console.error('Package save error:', err);
//             showToast('Error saving package', 'error');
//         }
//     });
// }

// /* ------ Helpers ------ */
// function formatStatus(status) {
//     const map = {
//         pending: 'Pending',
//         confirmed: 'Confirmed',
//         sample_collected: 'Sample Collected',
//         processing: 'Processing',
//         completed: 'Completed',
//         cancelled: 'Cancelled',
//     };
//     return map[status] || status;
// }
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../firebaseConfig');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/admins — master admin only
router.get('/', authenticateToken, requireRole('master'), async (req, res) => {
    try {
        const snapshot = await db.collection('admins').get();

        const admins = snapshot.docs.map((doc) => {
            const d = doc.data();
            return {
                id: doc.id,
                username: d.username,
                full_name: d.full_name || '',
                role: d.role,
                created_at: d.created_at,
            };
        });

        admins.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.json(admins);
    } catch (err) {
        console.error('GET /api/admins error:', err);
        res.status(500).json({ error: 'Server error', detail: err.message });
    }
});


module.exports = router;
