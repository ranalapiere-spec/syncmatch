// =====================================================================
// MODUL ADD-ON: GRUP BELAJAR & CHAT GRUP ALA WHATSAPP (groups.js)
// =====================================================================

let groupMessagesUnsub = null;

function openGroupsModal() {
    document.getElementById('utility-modal-title').innerText = '👥 Grup Belajar';
    state.activeGroupId = null;
    if (groupMessagesUnsub) {
        groupMessagesUnsub();
        groupMessagesUnsub = null;
    }
    renderGroupsListView();
    document.getElementById('utility-modal').classList.remove('hidden');
}

function renderGroupsListView() {
    const body = document.getElementById('utility-modal-body');
    if (!body) return;

    state.activeGroupId = null;
    if (groupMessagesUnsub) {
        groupMessagesUnsub();
        groupMessagesUnsub = null;
    }

    const myGroups = state.groups || [];
    const uid = state.user?.uid;

    body.innerHTML = `
        <div class="space-y-3">
            <button onclick="createNewStudyGroup()" class="w-full py-3 rounded-2xl btn-primary font-bold text-xs flex items-center justify-center gap-2 shadow">
                <i class="fa-solid fa-users-rectangle"></i>
                <span>+ Buat Grup Belajar Baru</span>
            </button>

            <div class="space-y-2.5">
                ${myGroups.map(g => {
                    const isCreator = g.creatorId === uid;
                    const memberCount = (g.members || []).length;
                    return `
                        <div class="p-3.5 rounded-2xl card-surface border" style="border-color: var(--border-color);">
                            <div class="flex items-center justify-between gap-2">
                                <div onclick="openGroupChatRoom('${g.id}')" class="flex-1 cursor-pointer min-w-0">
                                    <div class="flex items-center gap-1.5">
                                        <h5 class="text-xs font-extrabold truncate">${g.name || 'Grup Belajar'}</h5>
                                        ${isCreator ? `<span class="px-2 py-0.5 rounded-full soft-pill text-[9px] font-bold">Admin</span>` : ''}
                                    </div>
                                    <p class="text-[10px] mt-0.5 truncate" style="color: var(--text-sub);">
                                        ${memberCount} Anggota • ${g.lastMessage || 'Ketuk untuk buka obrolan grup'}
                                    </p>
                                </div>
                                <div class="flex items-center gap-1.5 shrink-0">
                                    <button onclick="openGroupChatRoom('${g.id}')" class="px-2.5 py-1.5 rounded-xl btn-primary text-[10px] font-bold">Chat</button>
                                    <button onclick="openGroupDetail('${g.id}')" class="px-2.5 py-1.5 rounded-xl soft-pill text-[10px] font-bold">Info</button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('') || `
                    <div class="p-6 rounded-2xl soft-pill text-center">
                        <p class="text-xs font-semibold mb-1">Belum ada grup belajar</p>
                        <p class="text-[10px]" style="color: var(--text-sub);">Buat grup baru atau gabung lewat tautan undangan temanmu.</p>
                    </div>
                `}
            </div>
        </div>
    `;
}

async function createNewStudyGroup() {
    openCustomDialog({
        title: 'Buat Grup Belajar Baru',
        subtitle: 'Masukkan nama grup diskusi atau kelompok belajarmu:',
        hasInput: true,
        placeholder: 'Contoh: Pejuang UTBK & Coding...',
        confirmText: 'Buat Grup',
        onConfirm: async (val) => {
            const name = (val || '').trim();
            if (!name) {
                showToast("Nama grup tidak boleh kosong", true);
                return;
            }
            try {
                await db.collection('groups').add({
                    name,
                    creatorId: state.user.uid,
                    members: [state.user.uid],
                    lastMessage: 'Grup dibuat',
                    updatedAt: Date.now(),
                    createdAt: Date.now()
                });
                showToast("Grup belajar berhasil dibuat! 🎉");
                renderGroupsListView();
            } catch (err) {
                showToast("Gagal membuat grup: " + err.message, true);
            }
        }
    });
}

function openGroupChatRoom(groupId) {
    const group = (state.groups || []).find(g => g.id === groupId);
    if (!group) return renderGroupsListView();

    state.activeGroupId = groupId;
    const body = document.getElementById('utility-modal-body');
    const memberCount = (group.members || []).length;

    body.innerHTML = `
        <div class="flex flex-col h-[62vh]">
            <div class="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b" style="border-color: var(--border-color);">
                <div class="flex items-center gap-2 min-w-0">
                    <button onclick="renderGroupsListView()" class="w-8 h-8 rounded-full soft-pill flex items-center justify-center text-xs shrink-0">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <div onclick="openGroupDetail('${group.id}')" class="cursor-pointer min-w-0">
                        <h4 class="text-xs font-extrabold truncate">${group.name}</h4>
                        <p class="text-[10px]" style="color: var(--text-sub);">${memberCount} Anggota • Ketuk untuk kelola</p>
                    </div>
                </div>
                <button onclick="openGroupDetail('${group.id}')" class="px-2.5 py-1.5 rounded-xl soft-pill text-[10px] font-bold shrink-0">
                    <i class="fa-solid fa-user-plus mr-1"></i>Anggota
                </button>
            </div>

            <div id="group-messages-scroll" class="flex-1 overflow-y-auto space-y-2 pr-1 mb-2.5"></div>

            <div class="flex items-center gap-2">
                <input type="text" id="group-msg-input" placeholder="Kirim pesan ke grup..."
                       class="flex-1 px-3.5 py-2.5 rounded-xl text-xs border outline-none"
                       style="background-color: var(--bg-main); border-color: var(--border-color); color: var(--text-main);"
                       onkeydown="if(event.key==='Enter') sendGroupMessage('${group.id}')">
                <button onclick="sendGroupMessage('${group.id}')" class="w-10 h-10 rounded-xl btn-primary flex items-center justify-center text-xs shrink-0">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        </div>
    `;

    if (groupMessagesUnsub) groupMessagesUnsub();
    groupMessagesUnsub = db.collection('groups').doc(groupId).collection('messages')
        .orderBy('createdAt', 'asc')
        .onSnapshot(snap => {
            const box = document.getElementById('group-messages-scroll');
            if (!box) return;
            const msgs = [];
            snap.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));

            box.innerHTML = msgs.map(m => {
                const isMine = m.senderId === state.user.uid;
                return `
                    <div class="flex flex-col ${isMine ? 'items-end' : 'items-start'}">
                        ${!isMine ? `<span class="text-[9px] font-bold ml-1 mb-0.5" style="color: var(--text-sub);">${m.senderName || 'Anggota'}</span>` : ''}
                        <div class="max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${isMine ? 'btn-primary rounded-br-xs' : 'soft-pill rounded-bl-xs'}">
                            ${m.text}
                        </div>
                    </div>
                `;
            }).join('') || `<p class="text-[11px] text-center py-8" style="color: var(--text-sub);">Mulai diskusi kelompok di sini!</p>`;

            box.scrollTop = box.scrollHeight;
        }, err => console.warn('Group messages listener:', err.message));
}

async function sendGroupMessage(groupId) {
    const inp = document.getElementById('group-msg-input');
    const text = (inp?.value || '').trim();
    if (!text) return;
    inp.value = '';

    try {
        await db.collection('groups').doc(groupId).collection('messages').add({
            senderId: state.user.uid,
            senderName: state.profile?.fullname || 'Anggota',
            text,
            createdAt: Date.now()
        });
        await db.collection('groups').doc(groupId).update({
            lastMessage: `${state.profile?.fullname || 'Anggota'}: ${text}`,
            updatedAt: Date.now()
        });
    } catch (err) {
        showToast("Gagal mengirim pesan grup: " + err.message, true);
    }
}

function openGroupDetail(groupId) {
    if (groupMessagesUnsub) {
        groupMessagesUnsub();
        groupMessagesUnsub = null;
    }
    const group = (state.groups || []).find(g => g.id === groupId);
    if (!group) return renderGroupsListView();

    state.activeGroupId = groupId;
    const body = document.getElementById('utility-modal-body');
    const members = group.members || [];
    const isCreator = group.creatorId === state.user.uid;

    body.innerHTML = `
        <div class="space-y-3">
            <div class="flex items-center justify-between gap-2 pb-2.5 border-b" style="border-color: var(--border-color);">
                <div class="min-w-0">
                    <h4 class="text-sm font-extrabold truncate">${group.name || 'Grup Belajar'}</h4>
                    <p class="text-[10px] truncate" style="color: var(--text-sub);">Group ID: <span class="font-mono">${group.id}</span></p>
                </div>
                <button onclick="openGroupChatRoom('${group.id}')" class="px-2.5 py-1.5 rounded-xl soft-pill text-[10px] font-bold shrink-0">← Chat Grup</button>
            </div>

            <div class="grid grid-cols-2 gap-2">
                <button onclick="openAddMemberFromFriends('${group.id}')" class="py-2.5 px-3 rounded-xl btn-primary text-[11px] font-bold flex items-center justify-center gap-1.5">
                    <i class="fa-solid fa-user-plus"></i>
                    <span>Tambah Teman</span>
                </button>
                <button onclick="openAddMemberByIdDialog('${group.id}')" class="py-2.5 px-3 rounded-xl soft-pill text-[11px] font-bold flex items-center justify-center gap-1.5">
                    <i class="fa-solid fa-id-badge"></i>
                    <span>Input User ID</span>
                </button>
            </div>

            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-extrabold">Anggota Grup (${members.length})</span>
                    <button onclick="copyTextToClipboard('${group.id}', 'Group ID disalin!')" class="text-[10px] font-bold underline" style="color: var(--accent);">Salin ID Grup</button>
                </div>

                <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
                    ${members.map(mUid => {
                        const u = mUid === state.user.uid
                            ? state.profile
                            : (state.allUsers || []).find(item => item.uid === mUid);
                        const info = u || { uid: mUid, fullname: 'Pengguna SYNC', username: mUid.slice(0, 8), photoURL: DEFAULT_AVATAR };
                        const isSelf = mUid === state.user.uid;
                        const isAdmin = mUid === group.creatorId;
                        return `
                            <div class="flex items-center justify-between gap-2 p-2.5 rounded-2xl soft-pill">
                                <div class="flex items-center gap-2.5 min-w-0">
                                    <img src="${info.photoURL || DEFAULT_AVATAR}" class="w-9 h-9 rounded-full object-cover shrink-0">
                                    <div class="min-w-0">
                                        <div class="flex items-center gap-1">
                                            <h5 class="text-xs font-bold truncate">${info.fullname || 'User'}</h5>
                                            ${isAdmin ? `<span class="px-1.5 py-0.5 rounded-full text-[9px] font-bold btn-primary">Admin</span>` : ''}
                                        </div>
                                        <p class="text-[9px] truncate" style="color: var(--text-sub);">@${info.username || 'user'} • <span class="font-mono">${mUid.slice(0, 10)}</span></p>
                                    </div>
                                </div>
                                ${isCreator && !isSelf ? `
                                    <button onclick="removeMemberFromGroup('${group.id}', '${mUid}')" class="w-8 h-8 rounded-xl card-surface text-red-500 flex items-center justify-center text-xs shrink-0" title="Keluarkan Anggota">
                                        <i class="fa-solid fa-user-minus"></i>
                                    </button>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <div class="pt-2.5 border-t flex gap-2" style="border-color: var(--border-color);">
                <button onclick="copyGroupInviteLink('${group.id}')" class="flex-1 py-2.5 rounded-xl soft-pill text-xs font-bold">
                    🔗 Salin Link Undangan
                </button>
                <button onclick="${isCreator ? `deleteStudyGroup('${group.id}')` : `leaveStudyGroup('${group.id}')`}" class="py-2.5 px-4 rounded-xl bg-red-500/15 text-red-500 text-xs font-bold">
                    ${isCreator ? 'Hapus Grup' : 'Keluar'}
                </button>
            </div>
        </div>
    `;
}

function openAddMemberFromFriends(groupId) {
    const group = (state.groups || []).find(g => g.id === groupId);
    if (!group) return;

    const members = group.members || [];
    const friendIds = state.profile?.friends || [];
    const candidateIds = friendIds.filter(fUid => !members.includes(fUid));

    const body = document.getElementById('utility-modal-body');
    body.innerHTML = `
        <div class="space-y-3">
            <div class="flex items-center justify-between pb-2 border-b" style="border-color: var(--border-color);">
                <div>
                    <h4 class="text-xs font-extrabold">Pilih Teman untuk Ditambahkan</h4>
                    <p class="text-[10px]" style="color: var(--text-sub);">Ke grup: ${group.name}</p>
                </div>
                <button onclick="openGroupDetail('${groupId}')" class="px-2.5 py-1.5 rounded-xl soft-pill text-[10px] font-bold">← Kembali</button>
            </div>

            <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
                ${candidateIds.map(fUid => {
                    const u = (state.allUsers || []).find(item => item.uid === fUid) || { uid: fUid, fullname: 'Teman', username: fUid.slice(0, 8), photoURL: DEFAULT_AVATAR };
                    return `
                        <div class="flex items-center justify-between gap-2 p-2.5 rounded-2xl soft-pill">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <img src="${u.photoURL || DEFAULT_AVATAR}" class="w-9 h-9 rounded-full object-cover shrink-0">
                                <div class="min-w-0">
                                    <h5 class="text-xs font-bold truncate">${u.fullname || 'Teman'}</h5>
                                    <p class="text-[9px] truncate" style="color: var(--text-sub);">@${u.username || 'user'}</p>
                                </div>
                            </div>
                            <button onclick="addMemberToGroup('${groupId}', '${fUid}')" class="px-3 py-1.5 rounded-xl btn-primary text-[10px] font-bold shrink-0">+ Tambahkan</button>
                        </div>
                    `;
                }).join('') || `
                    <div class="p-5 rounded-2xl soft-pill text-center space-y-2">
                        <p class="text-xs" style="color: var(--text-sub);">Semua temanmu sudah ada di grup atau daftar teman masih kosong.</p>
                        <button onclick="openAddMemberByIdDialog('${groupId}')" class="px-3 py-1.5 rounded-xl btn-primary text-[11px] font-bold">Tambah Lewat User ID</button>
                    </div>
                `}
            </div>
        </div>
    `;
}

function openAddMemberByIdDialog(groupId) {
    openCustomDialog({
        title: 'Tambah Anggota Lewat User ID',
        subtitle: 'Masukkan UID atau @username pengguna yang ingin dimasukkan ke grup:',
        hasInput: true,
        placeholder: 'Contoh: uid_pengguna atau @username',
        confirmText: 'Tambahkan',
        onConfirm: async (val) => {
            const raw = (val || '').trim();
            if (!raw) return;

            const cleanHandle = raw.replace(/^@/, '').toLowerCase();
            const foundUser = (state.allUsers || []).find(u =>
                (u.uid && u.uid === raw) ||
                (u.username && u.username.toLowerCase() === cleanHandle)
            );

            const targetUid = foundUser ? foundUser.uid : raw;
            if (!targetUid || targetUid === state.user.uid) {
                showToast("User ID tidak valid atau sudah ada di grup", true);
                return;
            }

            await addMemberToGroup(groupId, targetUid);
        }
    });
}

async function addMemberToGroup(groupId, targetUid) {
    try {
        await db.collection('groups').doc(groupId).update({
            members: firebase.firestore.FieldValue.arrayUnion(targetUid)
        });
        showToast("Anggota berhasil dimasukkan ke grup! ✨");
        openGroupDetail(groupId);
    } catch (err) {
        showToast("Gagal menambahkan anggota: " + err.message, true);
    }
}

async function removeMemberFromGroup(groupId, targetUid) {
    try {
        await db.collection('groups').doc(groupId).update({
            members: firebase.firestore.FieldValue.arrayRemove(targetUid)
        });
        showToast("Anggota dikeluarkan dari grup");
        openGroupDetail(groupId);
    } catch (err) {
        showToast("Gagal mengeluarkan anggota", true);
    }
}

async function leaveStudyGroup(groupId) {
    try {
        await db.collection('groups').doc(groupId).update({
            members: firebase.firestore.FieldValue.arrayRemove(state.user.uid)
        });
        showToast("Kamu keluar dari grup");
        renderGroupsListView();
    } catch (err) {
        showToast("Gagal keluar dari grup", true);
    }
}

async function deleteStudyGroup(groupId) {
    openCustomDialog({
        title: 'Hapus Grup Belajar',
        subtitle: 'Grup dan daftar anggotanya akan dihapus permanen.',
        confirmText: 'Hapus Grup',
        onConfirm: async () => {
            try {
                await db.collection('groups').doc(groupId).delete();
                showToast("Grup belajar dihapus");
                renderGroupsListView();
            } catch (err) {
                showToast("Gagal menghapus grup", true);
            }
        }
    });
}

function copyGroupInviteLink(groupId) {
    const link = `${window.location.origin}${window.location.pathname}?join=${encodeURIComponent(groupId)}`;
    copyTextToClipboard(link, "Link undangan grup disalin! 🔗");
}

function copyTextToClipboard(text, successMsg = "Berhasil disalin!") {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => showToast(successMsg)).catch(() => showToast(text));
    } else {
        showToast(text);
    }
}
