// CRUD + live subscription for generated media. Uploads the image bytes to
// Storage and stores the download URL on the mediaItem.
import { useEffect, useState } from 'react';
import { addDoc, deleteDoc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../lib/firebase/client';
import { mediaItemsCol, mediaItemDoc, mediaStoragePath } from '../lib/firebase/paths';
import { withAudit } from '../lib/firebase/converters';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import type { MediaItem } from '../types/models';

export interface NewMedia {
  kind: MediaItem['kind'];
  prompt: string;
  dataUrl: string;
  alt: string;
  width: number;
  height: number;
  provider: string;
  tags?: string[];
  sourceContentId?: string;
}

function extFor(dataUrl: string): { ext: string; mime: string } {
  const m = dataUrl.match(/^data:([^;,]+)/);
  const mime = m?.[1] ?? 'image/png';
  const ext = mime.includes('svg') ? 'svg' : mime.includes('jpeg') ? 'jpg' : mime.split('/')[1] ?? 'png';
  return { ext, mime };
}

export function useMediaItems() {
  const { businessId } = useBusiness();
  const { user } = useAuth();
  const [items, setItems] = useState<MediaItem[]>([]);

  useEffect(() => {
    if (!businessId) {
      setItems([]);
      return;
    }
    const q = query(mediaItemsCol(businessId), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MediaItem, 'id'>) })));
    });
  }, [businessId]);

  async function save(m: NewMedia): Promise<string> {
    if (!businessId || !user) throw new Error('No active business');
    const { ext, mime } = extFor(m.dataUrl);
    const fileName = `${m.kind}-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
    const blob = await (await fetch(m.dataUrl)).blob();
    const storageRef = ref(storage, mediaStoragePath(businessId, fileName));
    await uploadBytes(storageRef, blob, { contentType: mime });
    const url = await getDownloadURL(storageRef);
    const ref2 = await addDoc(
      mediaItemsCol(businessId),
      withAudit(businessId, user.uid, {
        kind: m.kind,
        prompt: m.prompt,
        url,
        alt: m.alt,
        width: m.width,
        height: m.height,
        provider: m.provider,
        status: 'draft' as const,
        tags: m.tags ?? [m.kind],
        ...(m.sourceContentId ? { sourceContentId: m.sourceContentId } : {}),
      }),
    );
    return ref2.id;
  }

  async function remove(id: string): Promise<void> {
    if (!businessId) return;
    await deleteDoc(mediaItemDoc(businessId, id));
  }

  return { items, save, remove };
}
