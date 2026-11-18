// =====================================================================
// MODUL TAMBAHAN: MANAJEMEN GRUP BELAJAR (groups.js)
// =====================================================================

function openGroupsModal() {
    document.getElementById('utility-modal-title').innerText = '👥 Kelola Grup Belajar';
    renderGroupsContent();
    document.getElementById('utility-modal').classList.remove('hidden');
}

function renderGroupsContent() {
    const body = document.getElementById('utility-modal-body');
    const myGroups = state.groups || [];

    body.innerHTML = `
        <div class="mb-3">
            <button onclick="createNewStudyGroup()" class="w-full py-2.5 rounded-xl btn-primary font-bold text-xs flex items-center justify-center gap-2">
                <i class="fa-solid fa-users-rectangle"></i> + Buat Grup Belajar Baru
            </button>
        </div>
        <div class="space-y-3">
            ${myGroups.map(g => {
                const isCreator = g.creatorId === state.user.uid;
                const membersCount = (g.members || []).length;
                return `
                    <div class="p-3.5 rounded-2xl card-surface border" style="border-color: var(--border-color);">
                        <div class="flex items-center justify-between mb-2">
                            <div>
                                <h5 class="text-xs font-extrabold text-main">${g.name}</h5>
                                <p class="text-[10px]" style="color: var(--text-sub);">${membersCount} Anggota • ${isCreator ? 'Pembuat Grup' : 'Anggota'}</p>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <button onclick="openGroupDetail('${g.id}')" class="px-2.5 py-1.5 rounded-xl soft-pill text-[10px] font-bold">Detail</button>
                                <button onclick="copyGroupInviteLink('${g.id}')" class="w-7 h-7 rounded-xl soft-pill flex items-center justify-center text-[10px]" title="Salin Tautan Undang"><i class="fa-solid fa-link"></i></button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('') || `<p class="text-xs text-center py-6" style="color: var(--text-sub);">Belum bergabung di grup belajar mana pun.</p>`}
        </div>
    `;
}

async function createNewStudyGroup() {
    openCustomDialog({
        title: 'Buat Grup Belajar',
        subtitle: 'Masukkan nama kelompok studimu:',
        hasInput: true,
        placeholder: 'Contoh: Pejuang Web Dev & UI/UX...',
        confirmText: 'Buat Grup',
        onConfirm: async (val) => {
            const name = val.trim();
            if (name) {
                await db.collection('groups').add({
                    name,
                    creatorId: state.user.uid,
                    members: [state.user.uid],
                    createdAt: Date.now()
                });
                openGroupsModal();
                showToast("Grup belajar berhasil dibuat! 🎉");
            }
        }
    });
}

function openGroupDetail(groupId) {
    const group = state.groups.find(g => g.id === groupId);
    if (!group) return;

    state.activeGroupId = groupId;
    const body = document.getElementById('utility-modal-body');
    const members = group.members || [];
    const isCreator = group.creatorId === state.user.uid;

    body.innerHTML = `
        <div class="space-y-3">
            <div class="flex items-center justify-between pb-2 border-b" style="border-color: var(--border-color);">
                <div>
                    <h4 class="text-sm font-extrabold">${group.name}</h4>
                    <p class="text-[10px]" style="color: var(--text-sub);">Dikelola secara real-time</p>
                </div>
                <button onclick="openGroupsModal()" class="px-2.5 py-1 rounded-xl soft-pill text-[10px] font-bold">← Kembali</button>
            </div>

            <div class="flex items-center justify-between">
                <span class="text-xs font-bold">Anggota Grup (${members.length})</span>
                <button onclick="openAddMemberToGroupModal('${groupId}')" class="px-3 py-1.5 rounded-xl btn-primary text-[10px] font-bold">+ Tambah Anggota</button>
            </div>

            <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
                ${members.map(mUid => {
                    const u = state.allUsers.find(item => item.uid === mUid) || (mUid === state.user.uid ? state.profile : null) || { fullname: 'Anggota', username: 'user', photoURL: DEFAULT_AVATAR };
                    const isSelf = mUid === state.user.uid;
                    return `
                        <div class="flex items-center justify-between p-2 rounded-xl soft-pill">
                            <div class="flex items-center gap-2">
                                <img src="${u.photoURL || DEFAULT_AVATAR}" class="w-8 h-8 rounded-full object-cover">
                                <div>
                                    <h5 class="text-xs font-bold">${u.fullname} ${mUid === group.creatorId ? '👑' : ''}</h5>
                                    <p class="text-[9px]" style="color: var(--text-sub);">@${u.username || 'user'}</p>
                                </div>
                            </div>
                            ${isCreator && !isSelf ? `
                                <button onclick="removeMemberFromGroup('${groupId}', '${mUid}')" class="text-red-500 text-xs px-2 py-1"><i class="fa-solid fa-user-minus"></i></button>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="pt-2 border-t flex gap-2" style="border-color: var(--border-color);">
                <button onclick="copyGroupInviteLink('${groupId}')" class="flex-1 py-2.5 rounded-xl soft-pill text-xs font-bold">🔗 Salin Link Undangan</button>
                <button onclick="${isCreator ? `deleteStudyGroup('${groupId}')` : `leaveStudyGroup('${groupId}')`}" class="py-2.5 px-4 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold">
                    ${isCreator ? 'Hapus Grup' : 'Keluar'}
                </button>
            </div>
        </div>
    `;
}

function openAddMemberToGroupModal(groupId) {
    const group = state.groups.find(g => g.id === groupId);
    if (!group) return;
    const members = group.members || [];
    const friends = state.profile?.friends || [];
    const availableFriends = friends.filter(fUid => !members.includes(fUid));

    const body = document.getElementById('utility-modal-body');
    body.innerHTML = `
        <div class="space-y-3">
            <div class="flex items-center justify-between pb-2 border-b" style="border-color: var(--border-color);">
                <h4 class="text-xs font-extrabold">Tambah Anggota dari Teman</h4>
                <button onclick="openGroupDetail('${groupId}')" class="px-2.5 py-1 rounded-xl soft-pill text-[10px] font-bold">← Kembali</button>
            </div>
            <div class="space-y-2 max-h-56 overflow-y-auto">
                ${availableFriends.map(fUid => {
                    const u = state.allUsers.find(item => item.uid === fUid) || { fullname: 'Teman', username: 'user', photoURL: DEFAULT_AVATAR };
                    return `
                        <div class="flex items-center justify-between p-2.5 rounded-2xl soft-pill">
                            <div class="flex items-center gap-2">
                                <img src="${u.photoURL || DEFAULT_AVATAR}" class="w-8 h-8 rounded-full object-cover">
                                <div><h5 class="text-xs font-bold">${u.fullname}</h5><p class="text-[9px]" style="color: var(--text-sub);">@${u.username}</p></div>
                            </div>
                            <button onclick="addMemberToGroup('${groupId}', '${fUid}')" class="px-3 py-1 rounded-xl btn-primary text-[10px] font-bold">+ Masukkan</button>
                        </div>
                    `;
                }).join('') || `<p class="text-xs text-center py-4" style="color: var(--text-sub);">Semua teman sudah masuk ke dalam grup ini.</p>`}
            </div>
        </div>
    `;
}

async function addMemberToGroup(groupId, targetUid) {
    const ref = db.collection('groups').doc(groupId);
    await ref.update({ members: firebase.firestore.FieldValue.arrayUnion(targetUid) });
    showToast("Anggota berhasil ditambahkan ke grup! ✨");
    openGroupDetail(groupId);
}

async function removeMemberFromGroup(groupId, targetUid) {
    const ref = db.collection('groups').doc(groupId);
    await ref.update({ members: firebase.firestore.FieldValue.arrayRemove(targetUid) });
    showToast("Anggota dikeluarkan dari grup");
    openGroupDetail(groupId);
}

async function leaveStudyGroup(groupId) {
    const ref = db.collection('groups').doc(groupId);
    await ref.update({ members: firebase.firestore.FieldValue.arrayRemove(state.user.uid) });
    showToast("Kamu telah keluar dari grup");
    openGroupsModal();
}

async function deleteStudyGroup(groupId) {
    openCustomDialog({
        title: 'Hapus Grup Belajar',
        subtitle: 'Grup ini akan dihapus permanen untuk semua anggota.',
        confirmText: 'Hapus',
        onConfirm: async () => {
            await db.collection('groups').doc(groupId).delete();
            showToast("Grup berhasil dihapus");
            openGroupsModal();
        }
    });
}
