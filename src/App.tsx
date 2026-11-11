import React, { useState, useEffect, useRef } from 'react';
import { 
  DicomStudy, 
  DicomSeries, 
  ToolType, 
  LayoutType, 
  UserRole, 
  Measurement, 
  WindowLevelPreset 
} from './types/dicom';
import { SAMPLE_STUDIES } from './data/sampleStudies';
import { WorkstationHeader } from './components/WorkstationHeader';
import { ViewerToolbar } from './components/ViewerToolbar';
import { MedicalViewport } from './components/MedicalViewport';
import { MPRWorkspace } from './components/MPRWorkspace';
import { Volume3DViewer } from './components/Volume3DViewer';
import { StudyBrowser } from './components/StudyBrowser';
import { ReportingModule } from './components/ReportingModule';
import { PacsManagementModal } from './components/PacsManagementModal';
import { AdminSecurityPanel } from './components/AdminSecurityPanel';
import { DeploymentDocModal } from './components/DeploymentDocModal';
import { DicomTagInspector } from './components/DicomTagInspector';

export default function App() {
  const [studies, setStudies] = useState<DicomStudy[]>(SAMPLE_STUDIES);
  const [activeStudy, setActiveStudy] = useState<DicomStudy>(SAMPLE_STUDIES[0]);
  const [activeSeries, setActiveSeries] = useState<DicomSeries>(SAMPLE_STUDIES[0].series[0]);
  const [currentSliceIndex, setCurrentSliceIndex] = useState<number>(11); // mid-head slice showing ventricles

  const [activeView, setActiveView] = useState<'viewer' | 'worklist' | 'reports' | 'pacs' | 'security' | 'deploy'>('viewer');
  const [activeLayout, setActiveLayout] = useState<LayoutType>('1x1');
  const [activeTool, setActiveTool] = useState<ToolType>('windowLevel');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('Radiologist');

  // Diagnostic calibration & image adjustments
  const [windowWidth, setWindowWidth] = useState<number>(80);
  const [windowCenter, setWindowCenter] = useState<number>(40);
  const [invert, setInvert] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Measurements per instance UID
  const [measurements, setMeasurements] = useState<Record<string, Measurement[]>>({});

  // Cine state
  const [isCinePlaying, setIsCinePlaying] = useState<boolean>(false);
  const [cineFps, setCineFps] = useState<number>(10);
  const cineIntervalRef = useRef<number | null>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // DICOM tag inspector modal
  const [showTagInspector, setShowTagInspector] = useState<boolean>(false);

  // PACS connected nodes count
  const [pacsConnectedCount, setPacsConnectedCount] = useState<number>(4);

  // Sync window/level when active series changes
  useEffect(() => {
    if (activeSeries.instances.length > 0) {
      const first = activeSeries.instances[0];
      setWindowWidth(first.windowWidth);
      setWindowCenter(first.windowCenter);
      setCurrentSliceIndex(Math.floor(activeSeries.instances.length / 2));
    }
  }, [activeSeries]);

  // Cine player loop
  useEffect(() => {
    if (isCinePlaying && activeSeries.instances.length > 1) {
      const intervalMs = Math.round(1000 / cineFps);
      cineIntervalRef.current = window.setInterval(() => {
        setCurrentSliceIndex((prev) => (prev + 1) % activeSeries.instances.length);
      }, intervalMs);
    } else {
      if (cineIntervalRef.current) {
        clearInterval(cineIntervalRef.current);
        cineIntervalRef.current = null;
      }
    }
    return () => {
      if (cineIntervalRef.current) clearInterval(cineIntervalRef.current);
    };
  }, [isCinePlaying, cineFps, activeSeries.instances.length]);

  const handleSelectStudy = (study: DicomStudy, series?: DicomSeries) => {
    setActiveStudy(study);
    const chosenSeries = series || study.series[0];
    setActiveSeries(chosenSeries);
    setCurrentSliceIndex(0);
    setActiveView('viewer');
  };

  const handleUploadCustomDicom = (newStudy: DicomStudy) => {
    setStudies((prev) => [newStudy, ...prev]);
    setActiveStudy(newStudy);
    setActiveSeries(newStudy.series[0]);
    setCurrentSliceIndex(0);
    setActiveView('viewer');
  };

  const handleApplyPreset = (preset: WindowLevelPreset) => {
    setWindowWidth(preset.windowWidth);
    setWindowCenter(preset.windowCenter);
  };

  const handleResetView = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setInvert(false);
    if (activeSeries.instances[0]) {
      setWindowWidth(activeSeries.instances[0].windowWidth);
      setWindowCenter(activeSeries.instances[0].windowCenter);
    }
  };

  const handleAddMeasurement = (m: Measurement) => {
    const key = m.instanceUid;
    setMeasurements((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), m],
    }));
  };

  const handleClearMeasurements = () => {
    const currentInst = activeSeries.instances[currentSliceIndex];
    if (currentInst) {
      setMeasurements((prev) => ({
        ...prev,
        [currentInst.sopInstanceUid]: [],
      }));
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const currentInstance = activeSeries.instances[currentSliceIndex] || activeSeries.instances[0];
  const currentInstanceMeasurements = currentInstance ? measurements[currentInstance.sopInstanceUid] || [] : [];

  return (
    <div className="w-screen h-screen flex flex-col bg-[#07090e] text-slate-100 overflow-hidden font-sans">
      {/* Top Workstation Header */}
      <WorkstationHeader
        activeStudy={activeStudy}
        activeLayout={activeLayout}
        onLayoutChange={(layout) => {
          setActiveLayout(layout);
          if (activeView !== 'viewer') setActiveView('viewer');
        }}
        activeView={activeView}
        onViewChange={setActiveView}
        currentUserRole={currentUserRole}
        onRoleChange={setCurrentUserRole}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        pacsConnectedCount={pacsConnectedCount}
      />

      {/* Main Workspace Stage */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* VIEW 1: Diagnostic Viewer Workspace */}
        {activeView === 'viewer' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar (Only for standard 2D viewports) */}
            {activeLayout !== 'mpr' && activeLayout !== '3d' && (
              <ViewerToolbar
                activeTool={activeTool}
                onToolSelect={setActiveTool}
                windowWidth={windowWidth}
                windowCenter={windowCenter}
                onWindowLevelChange={(w, c) => {
                  setWindowWidth(w);
                  setWindowCenter(c);
                }}
                onApplyPreset={handleApplyPreset}
                invert={invert}
                onToggleInvert={() => setInvert(!invert)}
                onRotateCW={() => setRotation((prev) => (prev + 90) % 360)}
                onRotateCCW={() => setRotation((prev) => (prev - 90 + 360) % 360)}
                onFlipH={() => setFlipH(!flipH)}
                onFlipV={() => setFlipV(!flipV)}
                onResetView={handleResetView}
                isCinePlaying={isCinePlaying}
                onToggleCine={() => setIsCinePlaying(!isCinePlaying)}
                cineFps={cineFps}
                onChangeCineFps={setCineFps}
                currentSlice={currentSliceIndex + 1}
                totalSlices={activeSeries.instances.length}
                onSliceStep={(dir) => {
                  setCurrentSliceIndex((prev) =>
                    Math.max(0, Math.min(activeSeries.instances.length - 1, prev + dir))
                  );
                }}
                onClearMeasurements={handleClearMeasurements}
                measurementCount={currentInstanceMeasurements.length}
                onOpenTagInspector={() => setShowTagInspector(true)}
              />
            )}

            {/* Viewport Canvas Grid Area */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left thumbnail strip if multi-series */}
              {activeStudy.series.length > 1 && (
                <div className="w-44 bg-[#0b0e14] border-r border-slate-800 p-2 overflow-y-auto space-y-2 select-none shrink-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Series ({activeStudy.series.length})
                  </div>
                  {activeStudy.series.map((ser) => (
                    <button
                      key={ser.seriesInstanceUid}
                      onClick={() => {
                        setActiveSeries(ser);
                        setCurrentSliceIndex(0);
                      }}
                      className={`w-full text-left p-2 rounded-lg border transition-colors ${
                        activeSeries.seriesInstanceUid === ser.seriesInstanceUid
                          ? 'bg-teal-950/60 border-teal-500 text-white'
                          : 'bg-[#07090e] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-xs truncate">#{ser.seriesNumber} {ser.seriesDescription}</div>
                      <div className="text-[10px] font-mono text-slate-400 flex justify-between mt-1">
                        <span>{ser.modality}</span>
                        <span>{ser.numberOfInstances} imgs</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Viewport Renderers */}
              <div className="flex-1 flex overflow-hidden bg-[#05070a]">
                {activeLayout === 'mpr' ? (
                  <MPRWorkspace
                    series={activeSeries}
                    windowWidth={windowWidth}
                    windowCenter={windowCenter}
                    invert={invert}
                  />
                ) : activeLayout === '3d' ? (
                  <Volume3DViewer series={activeSeries} />
                ) : activeLayout === '1x1' ? (
                  <MedicalViewport
                    viewportId="vp-1"
                    study={activeStudy}
                    series={activeSeries}
                    currentInstanceIndex={currentSliceIndex}
                    onSliceChange={setCurrentSliceIndex}
                    activeTool={activeTool}
                    windowWidth={windowWidth}
                    windowCenter={windowCenter}
                    onWindowLevelChange={(w, c) => {
                      setWindowWidth(w);
                      setWindowCenter(c);
                    }}
                    invert={invert}
                    rotation={rotation}
                    flipH={flipH}
                    flipV={flipV}
                    measurements={currentInstanceMeasurements}
                    onAddMeasurement={handleAddMeasurement}
                    isActive={true}
                    onSelectViewport={() => {}}
                  />
                ) : activeLayout === '1x2' ? (
                  <div className="w-full h-full grid grid-cols-2 gap-1 p-0.5">
                    <MedicalViewport
                      viewportId="vp-1"
                      study={activeStudy}
                      series={activeSeries}
                      currentInstanceIndex={currentSliceIndex}
                      onSliceChange={setCurrentSliceIndex}
                      activeTool={activeTool}
                      windowWidth={windowWidth}
                      windowCenter={windowCenter}
                      onWindowLevelChange={(w, c) => {
                        setWindowWidth(w);
                        setWindowCenter(c);
                      }}
                      invert={invert}
                      rotation={rotation}
                      flipH={flipH}
                      flipV={flipV}
                      measurements={currentInstanceMeasurements}
                      onAddMeasurement={handleAddMeasurement}
                      isActive={true}
                      onSelectViewport={() => {}}
                    />
                    <MedicalViewport
                      viewportId="vp-2"
                      study={activeStudy}
                      series={activeStudy.series[1] || activeSeries}
                      currentInstanceIndex={0}
                      onSliceChange={() => {}}
                      activeTool={activeTool}
                      windowWidth={windowWidth}
                      windowCenter={windowCenter}
                      onWindowLevelChange={(w, c) => {
                        setWindowWidth(w);
                        setWindowCenter(c);
                      }}
                      invert={invert}
                      rotation={rotation}
                      flipH={flipH}
                      flipV={flipV}
                      measurements={[]}
                      onAddMeasurement={handleAddMeasurement}
                      isActive={false}
                      onSelectViewport={() => {}}
                    />
                  </div>
                ) : activeLayout === '2x1' ? (
                  <div className="w-full h-full grid grid-rows-2 gap-1 p-0.5">
                    <MedicalViewport
                      viewportId="vp-1"
                      study={activeStudy}
                      series={activeSeries}
                      currentInstanceIndex={currentSliceIndex}
                      onSliceChange={setCurrentSliceIndex}
                      activeTool={activeTool}
                      windowWidth={windowWidth}
                      windowCenter={windowCenter}
                      onWindowLevelChange={(w, c) => {
                        setWindowWidth(w);
                        setWindowCenter(c);
                      }}
                      invert={invert}
                      rotation={rotation}
                      flipH={flipH}
                      flipV={flipV}
                      measurements={currentInstanceMeasurements}
                      onAddMeasurement={handleAddMeasurement}
                      isActive={true}
                      onSelectViewport={() => {}}
                    />
                    <MedicalViewport
                      viewportId="vp-2"
                      study={activeStudy}
                      series={activeStudy.series[1] || activeSeries}
                      currentInstanceIndex={0}
                      onSliceChange={() => {}}
                      activeTool={activeTool}
                      windowWidth={windowWidth}
                      windowCenter={windowCenter}
                      onWindowLevelChange={(w, c) => {
                        setWindowWidth(w);
                        setWindowCenter(c);
                      }}
                      invert={invert}
                      rotation={rotation}
                      flipH={flipH}
                      flipV={flipV}
                      measurements={[]}
                      onAddMeasurement={handleAddMeasurement}
                      isActive={false}
                      onSelectViewport={() => {}}
                    />
                  </div>
                ) : (
                  /* 2x2 Quad Layout */
                  <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-1 p-0.5">
                    {[0, 1, 2, 3].map((idx) => {
                      const ser = activeStudy.series[idx % activeStudy.series.length];
                      return (
                        <MedicalViewport
                          key={idx}
                          viewportId={`vp-${idx}`}
                          study={activeStudy}
                          series={ser}
                          currentInstanceIndex={idx === 0 ? currentSliceIndex : 0}
                          onSliceChange={idx === 0 ? setCurrentSliceIndex : () => {}}
                          activeTool={activeTool}
                          windowWidth={windowWidth}
                          windowCenter={windowCenter}
                          onWindowLevelChange={(w, c) => {
                            setWindowWidth(w);
                            setWindowCenter(c);
                          }}
                          invert={invert}
                          rotation={rotation}
                          flipH={flipH}
                          flipV={flipV}
                          measurements={idx === 0 ? currentInstanceMeasurements : []}
                          onAddMeasurement={handleAddMeasurement}
                          isActive={idx === 0}
                          onSelectViewport={() => {}}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Modality Worklist (MWL) & Study Browser */}
        {activeView === 'worklist' && (
          <StudyBrowser
            studies={studies}
            activeStudy={activeStudy}
            onSelectStudy={handleSelectStudy}
            onUploadCustomDicom={handleUploadCustomDicom}
          />
        )}

        {/* VIEW 3: Structured Radiology Reporting */}
        {activeView === 'reports' && (
          <ReportingModule
            activeStudy={activeStudy}
            currentUserRole={currentUserRole}
          />
        )}

        {/* VIEW 4: Universal PACS Connectivity Manager */}
        {activeView === 'pacs' && (
          <PacsManagementModal />
        )}

        {/* VIEW 5: Enterprise Security, RBAC & Audit Trails */}
        {activeView === 'security' && (
          <AdminSecurityPanel />
        )}

        {/* VIEW 6: Production Deployment & Architecture Guides */}
        {activeView === 'deploy' && (
          <DeploymentDocModal />
        )}
      </div>

      {/* DICOM Header Tag Inspector Modal */}
      {showTagInspector && currentInstance && (
        <DicomTagInspector
          instance={currentInstance}
          onClose={() => setShowTagInspector(false)}
        />
      )}
    </div>
  );
}
