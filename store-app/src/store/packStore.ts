import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from './index';
import { fetchPacksThunk, deletePackThunk, updatePackThunk, uploadImageThunk, clearErrorAction } from './packSlice';
import { Pack } from '../api/client';

// Custom wrapper hook to bridge the original Zustand API interface to Redux Toolkit.
export const usePackStore = () => {
  const dispatch = useDispatch<AppDispatch>();
  const packState = useSelector((state: RootState) => state.pack);

  const fetchPacks = useCallback(async () => {
    await dispatch(fetchPacksThunk()).unwrap();
  }, [dispatch]);

  const deletePack = useCallback(async (id: string) => {
    await dispatch(deletePackThunk(id)).unwrap();
  }, [dispatch]);

  const updatePack = useCallback(async (id: string, data: Partial<Pack>) => {
    return await dispatch(updatePackThunk({ id, data })).unwrap();
  }, [dispatch]);

  const uploadImage = useCallback(async (id: string, file: File) => {
    await dispatch(uploadImageThunk({ id, file })).unwrap();
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearErrorAction());
  }, [dispatch]);

  return {
    ...packState,
    fetchPacks,
    deletePack,
    updatePack,
    uploadImage,
    clearError,
  };
};
