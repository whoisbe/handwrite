import svgPaths from "./svg-x7f6vq0myw";

function Icon() {
  return (
    <div className="basis-0 grow h-full min-h-px min-w-px relative shrink-0 z-[1]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="Icon">
          <path d={svgPaths.p15f6aaf0} fill="var(--fill-0, #4F378A)" id="icon" />
        </g>
      </svg>
    </div>
  );
}

function StateLayer() {
  return (
    <div className="box-border content-stretch flex isolate items-center justify-center p-[16px] relative rounded-[16px] shrink-0 size-[56px]" data-name="State-layer">
      <Icon />
    </div>
  );
}

function Fab() {
  return (
    <div className="absolute bg-white box-border content-stretch flex items-center justify-center left-[590px] overflow-clip rounded-[16px] shadow-[0px_4px_8px_3px_rgba(0,0,0,0.15),0px_1px_3px_0px_rgba(0,0,0,0.3)] top-[13px]" data-name="FAB">
      <StateLayer />
    </div>
  );
}

function Icon1() {
  return (
    <div className="basis-0 grow h-full min-h-px min-w-px relative shrink-0 z-[1]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="Icon">
          <path d={svgPaths.p217bb200} fill="var(--fill-0, #4F378A)" id="icon" />
        </g>
      </svg>
    </div>
  );
}

function StateLayer1() {
  return (
    <div className="box-border content-stretch flex isolate items-center justify-center p-[16px] relative rounded-[16px] shrink-0 size-[56px]" data-name="State-layer">
      <Icon1 />
    </div>
  );
}

function Fab1() {
  return (
    <div className="absolute bg-white box-border content-stretch flex items-center justify-center left-[510px] overflow-clip rounded-[16px] shadow-[0px_4px_8px_3px_rgba(0,0,0,0.15),0px_1px_3px_0px_rgba(0,0,0,0.3)] top-[13px]" data-name="FAB">
      <StateLayer1 />
    </div>
  );
}

function Icon2() {
  return (
    <div className="basis-0 grow h-full min-h-px min-w-px relative shrink-0 z-[1]" data-name="Icon">
      <div className="absolute inset-[16.67%_16.67%_20.83%_16.67%]" data-name="icon">
        <div className="absolute inset-0" style={{ "--fill-0": "rgba(79, 55, 138, 1)" } as React.CSSProperties}>
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 15">
            <path d={svgPaths.p22d78f90} fill="var(--fill-0, #4F378A)" id="icon" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function StateLayer2() {
  return (
    <div className="box-border content-stretch flex isolate items-center justify-center p-[16px] relative rounded-[16px] shrink-0 size-[56px]" data-name="State-layer">
      <Icon2 />
    </div>
  );
}

function Fab2() {
  return (
    <div className="absolute bg-white box-border content-stretch flex items-center justify-center left-[430px] overflow-clip rounded-[16px] shadow-[0px_4px_8px_3px_rgba(0,0,0,0.15),0px_1px_3px_0px_rgba(0,0,0,0.3)] top-[13px]" data-name="FAB">
      <StateLayer2 />
    </div>
  );
}

function Frame2() {
  return (
    <div className="absolute bg-[#eeeeee] h-[369px] left-[24px] overflow-clip top-[180px] w-[665px]">
      <Fab />
      <Fab1 />
      <Fab2 />
      <div className="absolute flex flex-col font-['Gloria_Hallelujah:Regular',sans-serif] h-[183px] justify-center leading-[0] left-[calc(50%-0.5px)] not-italic opacity-30 text-[128px] text-black text-center top-1/2 translate-x-[-50%] translate-y-[-50%] w-[324px]">
        <p className="leading-[16px]">A</p>
      </div>
    </div>
  );
}

function Frame1() {
  return (
    <div className="absolute h-[70px] left-0 overflow-clip top-[20px] w-[1512px]">
      <p className="absolute font-['Permanent_Marker:Regular',sans-serif] leading-[normal] left-[694px] not-italic text-[40px] text-black text-nowrap top-[12px] whitespace-pre">Handwrite</p>
    </div>
  );
}

function ChevronDown() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Chevron down">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Chevron down">
          <path d="M4 6L8 10L12 6" id="Icon" stroke="var(--stroke-0, #1E1E1E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
        </g>
      </svg>
    </div>
  );
}

function Select() {
  return (
    <div className="bg-white h-[40px] min-w-[240px] relative rounded-[8px] shrink-0 w-full" data-name="Select">
      <div aria-hidden="true" className="absolute border border-[#d9d9d9] border-solid inset-[-0.5px] pointer-events-none rounded-[8.5px]" />
      <div className="flex flex-row items-center min-w-inherit size-full">
        <div className="box-border content-stretch flex gap-[8px] h-[40px] items-center min-w-inherit pl-[16px] pr-[12px] py-[12px] relative w-full">
          <p className="basis-0 font-['Inter:Regular',sans-serif] font-normal grow leading-none min-h-px min-w-px not-italic relative shrink-0 text-[#1e1e1e] text-[16px]">Gloria-Hallelujah</p>
          <ChevronDown />
        </div>
      </div>
    </div>
  );
}

function SelectField() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] items-start left-[24px] top-[90px]" data-name="Select Field">
      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.4] min-w-full not-italic relative shrink-0 text-[#1e1e1e] text-[16px] w-[min-content]">Font</p>
      <Select />
    </div>
  );
}

function Icon3() {
  return (
    <div className="basis-0 grow h-full min-h-px min-w-px relative shrink-0 z-[1]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="Icon">
          <path d="M8 19V5L19 12L8 19Z" fill="var(--fill-0, #4F378A)" id="icon" />
        </g>
      </svg>
    </div>
  );
}

function StateLayer3() {
  return (
    <div className="box-border content-stretch flex isolate items-center justify-center p-[16px] relative rounded-[16px] shrink-0 size-[56px]" data-name="State-layer">
      <Icon3 />
    </div>
  );
}

function Fab3() {
  return (
    <div className="absolute bg-white box-border content-stretch flex items-center justify-center left-[20px] overflow-clip rounded-[16px] shadow-[0px_4px_8px_3px_rgba(0,0,0,0.15),0px_1px_3px_0px_rgba(0,0,0,0.3)] top-[13px]" data-name="FAB">
      <StateLayer3 />
    </div>
  );
}

function Frame3() {
  return (
    <div className="absolute bg-[#eeeeee] h-[369px] left-[796px] overflow-clip top-[180px] w-[665px]">
      <Fab3 />
      <div className="absolute flex flex-col font-['Gloria_Hallelujah:Regular',sans-serif] h-[183px] justify-center leading-[0] left-[calc(50%+0.5px)] not-italic text-[128px] text-black text-center top-1/2 translate-x-[-50%] translate-y-[-50%] w-[324px]">
        <p className="leading-[16px]">A</p>
      </div>
    </div>
  );
}

export default function Frame() {
  return (
    <div className="bg-white relative size-full">
      <Frame2 />
      <Frame1 />
      <SelectField />
      <Frame3 />
    </div>
  );
}