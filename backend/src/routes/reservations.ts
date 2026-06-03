import { Router, Request, Response, NextFunction } from 'express';
import Boom from '@hapi/boom';
import { supabase } from '../config/supabase';
import { AuthRequest, authenticate, requireRole } from '../middleware/auth';
import { ReservationStatus } from '../types';

const router = Router();

async function generateUniquePickupCode(): Promise<string> {
  let code: string;
  let exists = true;
  while (exists) {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data } = await supabase
      .from('reservations')
      .select('id')
      .eq('pickup_code', code)
      .maybeSingle();
    exists = !!data;
  }
  return code!;
}

router.post('/', authenticate, requireRole(['consumer']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { pack_id, quantity } = req.body;

    if (!pack_id || !quantity || quantity < 1) {
      throw Boom.badRequest('Invalid pack ID or quantity');
    }

    const { data: pack, error: packError } = await supabase
      .from('packs')
      .select('*')
      .eq('id', pack_id)
      .eq('status', 'active')
      .single();

    if (packError || !pack) {
      throw Boom.notFound('Pack not found or not available');
    }

    if (pack.remaining_quantity < quantity) {
      throw Boom.badRequest('Insufficient quantity available');
    }

    const pickupCode = await generateUniquePickupCode();

    const { data: reservation, error } = await supabase
      .from('reservations')
      .insert({
        user_id: req.user!.id,
        pack_id,
        quantity,
        status: ReservationStatus.RESERVED,
        pickup_code: pickupCode
      })
      .select('*, packs(*), users(id, name, email)')
      .single();

    if (error) {
      throw error;
    }

    const newQuantity = pack.remaining_quantity - quantity;
    
    await supabase
      .from('packs')
      .update({ 
        remaining_quantity: newQuantity,
        status: newQuantity <= 0 ? 'sold_out' : 'active'
      })
      .eq('id', pack_id);

    res.status(201).json(reservation);
  } catch (error: any) {
    next(error);
  }
});

router.get('/my', authenticate, requireRole(['consumer']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('*, packs(*, stores(*, users:owner_id(id, name, email, profile_image)))')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(reservations);
  } catch (error: any) {
    next(error);
  }
});

router.get('/store', authenticate, requireRole(['store_admin']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', req.user!.id)
      .single();

    if (storeError || !store) {
      throw Boom.notFound('Store not found');
    }

    const { data: packs, error: packsError } = await supabase
      .from('packs')
      .select('id')
      .eq('store_id', store.id);

    if (packsError) {
      throw packsError;
    }

    if (!packs || packs.length === 0) {
      return res.json([]);
    }

    const packIds = packs.map(p => p.id);

    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('*, packs(*), users(id, name, email)')
      .in('pack_id', packIds)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(reservations);
  } catch (error: any) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { data: reservation, error } = await supabase
      .from('reservations')
      .select('*, packs(*, stores(*, users:owner_id(id, name, email, profile_image)))')
      .eq('id', id)
      .single();

    if (error || !reservation) {
      throw Boom.notFound('Reservation not found');
    }

    const isConsumer = reservation.user_id === req.user!.id;
    const isStoreAdmin = req.user!.role === 'store_admin';

    if (isConsumer || isStoreAdmin) {
      return res.json(reservation);
    }

    throw Boom.forbidden('Unauthorized');
  } catch (error: any) {
    next(error);
  }
});

router.patch('/:id/status', authenticate, requireRole(['store_admin']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log('UPDATE STATUS - id:', id, 'status:', status, 'user role:', req.user?.role);

    if (!['in_process', 'ready'].includes(status)) {
      throw Boom.badRequest('Invalid status');
    }

    const { data: reservation, error: findError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !reservation) {
      throw Boom.notFound('Reservation not found');
    }

    console.log('Found reservation, status:', reservation.status);

    const { data: pack, error: packError } = await supabase
      .from('packs')
      .select('store_id')
      .eq('id', reservation.pack_id)
      .single();

    if (packError || !pack) {
      throw Boom.notFound('Pack not found');
    }

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('owner_id')
      .eq('id', pack.store_id)
      .single();

    if (storeError || !store) {
      throw Boom.notFound('Store error');
    }

    console.log('Store owner:', store.owner_id, 'User id:', req.user!.id);

    if (store.owner_id !== req.user!.id) {
      throw Boom.forbidden('Unauthorized');
    }

    if (status === 'in_process' && reservation.status !== 'reserved') {
      throw Boom.badRequest('Only reserved orders can move to in process');
    }

    if (status === 'ready' && reservation.status !== 'in_process') {
      throw Boom.badRequest('Only in process orders can move to ready');
    }

    console.log('Proceeding to update...');

    const { data: updatedReservation, error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', id)
      .select('*, packs(*), users(id, name, email)')
      .single();

    if (error) {
      throw error;
    }

    console.log('Success! Updated reservation:', updatedReservation);
    res.json(updatedReservation);
  } catch (error: any) {
    next(error);
  }
});

router.post('/:id/verify', authenticate, requireRole(['store_admin']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { pickup_code } = req.body;

    if (!pickup_code) {
      throw Boom.badRequest('Pickup code required');
    }

    const { data: reservation, error: findError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !reservation) {
      throw Boom.notFound('Reservation not found');
    }

    const { data: pack, error: packError } = await supabase
      .from('packs')
      .select('*, stores(*)')
      .eq('id', reservation.pack_id)
      .single();

    if (packError || !pack || pack.stores.owner_id !== req.user!.id) {
      throw Boom.forbidden('Unauthorized');
    }

    if (reservation.pickup_code !== pickup_code) {
      throw Boom.badRequest('Invalid pickup code');
    }

    if (![ReservationStatus.RESERVED, ReservationStatus.READY].includes(reservation.status)) {
      throw Boom.badRequest('Reservation cannot be verified yet');
    }

    const { data: updatedReservation, error } = await supabase
      .from('reservations')
      .update({ status: ReservationStatus.PICKED_UP })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({ message: 'Pickup verified successfully', reservation: updatedReservation });
  } catch (error: any) {
    next(error);
  }
});

router.post('/verify-code', authenticate, requireRole(['store_admin']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { pickup_code } = req.body;

    if (!pickup_code) {
      throw Boom.badRequest('Pickup code required');
    }

    const code = pickup_code.toUpperCase();

    const { data: reservation, error: findError } = await supabase
      .from('reservations')
      .select('*, packs(*, stores(*))')
      .eq('pickup_code', code)
      .maybeSingle();

    if (findError || !reservation) {
      throw Boom.notFound('Reservation not found with that code');
    }

    if (!reservation.packs?.stores || reservation.packs.stores.owner_id !== req.user!.id) {
      throw Boom.forbidden('Unauthorized');
    }

    if (![ReservationStatus.RESERVED, ReservationStatus.READY].includes(reservation.status)) {
      throw Boom.badRequest('Reservation cannot be verified yet');
    }

    const { data: updatedReservation, error } = await supabase
      .from('reservations')
      .update({ status: ReservationStatus.PICKED_UP })
      .eq('id', reservation.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({ message: 'Pickup verified successfully', reservation: updatedReservation });
  } catch (error: any) {
    next(error);
  }
});

router.post('/:id/cancel', authenticate, requireRole(['consumer']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { data: reservation, error: findError } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user!.id)
      .single();

    if (findError || !reservation) {
      throw Boom.notFound('Reservation not found');
    }

    if (reservation.status !== ReservationStatus.RESERVED) {
      throw Boom.badRequest('Cannot cancel this reservation');
    }

    const { error } = await supabase
      .from('reservations')
      .update({ status: ReservationStatus.CANCELLED })
      .eq('id', id);

    if (error) {
      throw error;
    }

    const { data: pack, error: packError } = await supabase
      .from('packs')
      .select('id, remaining_quantity, total_quantity, status')
      .eq('id', reservation.pack_id)
      .single();

    if (!packError && pack) {
      const nextRemaining = Math.min(pack.total_quantity, pack.remaining_quantity + reservation.quantity);
      const nextStatus = nextRemaining > 0 ? 'active' : pack.status;

      await supabase
        .from('packs')
        .update({ remaining_quantity: nextRemaining, status: nextStatus })
        .eq('id', reservation.pack_id);
    }

    res.json({ message: 'Reservation cancelled successfully' });
  } catch (error: any) {
    next(error);
  }
});

router.post('/:id/reject', authenticate, requireRole(['store_admin']), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { data: reservation, error: findError } = await supabase
      .from('reservations')
      .select('*, packs(*), users(id, name, email)')
      .eq('id', id)
      .single();

    if (findError || !reservation) {
      throw Boom.notFound('Reservation not found');
    }

    const { data: pack, error: packError } = await supabase
      .from('packs')
      .select('store_id')
      .eq('id', reservation.pack_id)
      .single();

    if (packError || !pack) {
      throw Boom.notFound('Pack not found');
    }

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('owner_id')
      .eq('id', pack.store_id)
      .single();

    if (storeError || !store || store.owner_id !== req.user!.id) {
      throw Boom.forbidden('Unauthorized');
    }

    if (reservation.status !== 'reserved' && reservation.status !== 'in_process') {
      throw Boom.badRequest('Cannot reject this reservation');
    }

    await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', id);

    const { data: packData, error: packDataError } = await supabase
      .from('packs')
      .select('id, remaining_quantity, total_quantity, status')
      .eq('id', reservation.pack_id)
      .single();

    if (!packDataError && packData) {
      const nextRemaining = Math.min(packData.total_quantity, packData.remaining_quantity + reservation.quantity);
      const nextStatus = nextRemaining > 0 ? 'active' : packData.status;

      await supabase
        .from('packs')
        .update({ remaining_quantity: nextRemaining, status: nextStatus })
        .eq('id', reservation.pack_id);
    }

    res.json({ message: 'Reservation rejected successfully' });
  } catch (error: any) {
    next(error);
  }
});

export default router;
