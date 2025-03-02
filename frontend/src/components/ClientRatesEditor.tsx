import { useState } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputAdornment,
  Tooltip,
  Alert
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { ClientRate, useClientRates } from '../hooks/useClientRates';

interface ClientRatesEditorProps {
  availableClients?: string[];
  onRatesChanged?: () => void;
}

export default function ClientRatesEditor({ availableClients = [], onRatesChanged }: ClientRatesEditorProps) {
  const [open, setOpen] = useState(false);
  const [editingClientName, setEditingClientName] = useState('');
  const [editingRate, setEditingRate] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { clientRates, getClientRate, setClientRate, removeClientRate } = useClientRates();

  // Récupérer les clients sans TJM défini
  const clientsWithoutRates = availableClients.filter(
    client => !clientRates.some(rate => rate.clientName === client)
  );

  const handleOpen = () => {
    setOpen(true);
    setEditingClientName('');
    setEditingRate('');
    setErrorMessage('');
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleEditClient = (clientName: string) => {
    const rate = getClientRate(clientName);
    setEditingClientName(clientName);
    setEditingRate(rate.toString());
    setErrorMessage('');
  };

  const handleAddOrUpdateClient = () => {
    if (!editingClientName.trim()) {
      setErrorMessage('Le nom du client est requis');
      return;
    }

    const rateValue = parseFloat(editingRate);
    if (isNaN(rateValue) || rateValue < 0) {
      setErrorMessage('Le TJM doit être un nombre positif ou nul');
      return;
    }

    setClientRate(editingClientName, rateValue);
    setEditingClientName('');
    setEditingRate('');
    setErrorMessage('');
    if (onRatesChanged) onRatesChanged();
  };

  const handleDeleteClient = (clientName: string) => {
    removeClientRate(clientName);
    if (onRatesChanged) onRatesChanged();
  };

  return (
    <>
      <Button
        variant="outlined"
        onClick={handleOpen}
        startIcon={<EditIcon />}
        size="small"
      >
        Gérer les TJM
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Gérer les TJM par client</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Définissez un TJM spécifique pour chaque client. Si aucun TJM n'est défini, le TJM par défaut (0€) sera utilisé.
            </Typography>

            {/* Formulaire d'ajout/édition */}
            <Box sx={{ display: 'flex', gap: 2, mt: 2, mb: 3, alignItems: 'flex-start' }}>
              <TextField
                label="Client"
                value={editingClientName}
                onChange={(e) => setEditingClientName(e.target.value)}
                select={editingClientName === '' && clientsWithoutRates.length > 0}
                SelectProps={{ native: true }}
                fullWidth
              >
                {editingClientName === '' && (
                  <>
                    <option value="">Sélectionnez un client ou saisissez un nom</option>
                    {clientsWithoutRates.map(client => (
                      <option key={client} value={client}>{client}</option>
                    ))}
                  </>
                )}
              </TextField>
              <TextField
                label="TJM (€)"
                value={editingRate}
                onChange={(e) => setEditingRate(e.target.value)}
                type="number"
                InputProps={{
                  endAdornment: <InputAdornment position="end">€</InputAdornment>,
                }}
                sx={{ width: '160px' }}
              />
              <Button 
                variant="contained" 
                onClick={handleAddOrUpdateClient}
                sx={{ height: '56px' }}
              >
                {editingClientName && clientRates.some(rate => rate.clientName === editingClientName) 
                  ? 'Mettre à jour' 
                  : 'Ajouter'}
              </Button>
            </Box>

            {errorMessage && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage}
              </Alert>
            )}

            {/* Tableau des TJM */}
            {clientRates.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Client</TableCell>
                      <TableCell align="right">TJM (€)</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {clientRates.map((rate) => (
                      <TableRow key={rate.clientName}>
                        <TableCell>{rate.clientName}</TableCell>
                        <TableCell align="right">{rate.rate} €</TableCell>
                        <TableCell align="center">
                          <Tooltip title="Modifier">
                            <IconButton 
                              size="small" 
                              onClick={() => handleEditClient(rate.clientName)}
                              color="primary"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Supprimer">
                            <IconButton 
                              size="small" 
                              onClick={() => handleDeleteClient(rate.clientName)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">
                Aucun TJM client défini. Le TJM par défaut (0€) sera utilisé pour tous les clients.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 